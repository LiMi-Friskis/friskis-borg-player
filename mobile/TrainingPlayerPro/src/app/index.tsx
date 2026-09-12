import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  BleManager,
  Characteristic,
  Device,
  Service,
  Subscription,
} from "@sfourdrinier/react-native-ble-plx";

const HEART_RATE_SERVICE = "180D";
const HEART_RATE_MEASUREMENT = "2A37";

const RUNNING_SPEED_CADENCE_SERVICE = "1814";
const RSC_MEASUREMENT = "2A53";

const CYCLING_POWER_SERVICE = "1818";
const CYCLING_POWER_MEASUREMENT = "2A63";

const FITNESS_MACHINE_SERVICE = "1826";

type Capability =
  | "heart-rate"
  | "running-speed-cadence"
  | "cycling-power"
  | "fitness-machine";

type DiagnosticService = {
  uuid: string;
  name: string;
  characteristics: DiagnosticCharacteristic[];
};

type DiagnosticCharacteristic = {
  uuid: string;
  readable: boolean;
  notifiable: boolean;
  indicatable: boolean;
  writable: boolean;
};

export default function DeviceManagerScreen() {
  const bleManager = useRef(new BleManager()).current;

  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [connectedDevice, setConnectedDevice] =
    useState<Device | null>(null);

  const [capabilities, setCapabilities] =
    useState<Capability[]>([]);

  const [heartRate, setHeartRate] =
    useState<number | null>(null);

  const [runningSpeedKmh, setRunningSpeedKmh] =
    useState<number | null>(null);

  const [runningCadence, setRunningCadence] =
    useState<number | null>(null);

  const [runningStatus, setRunningStatus] =
    useState<"walking" | "running" | null>(null);

  const [strideLength, setStrideLength] =
    useState<number | null>(null);

  const [totalDistance, setTotalDistance] =
    useState<number | null>(null);

  const [power, setPower] =
    useState<number | null>(null);

  const [cyclingCadenceDetected, setCyclingCadenceDetected] =
    useState(false);

  const [diagnostics, setDiagnostics] =
    useState<DiagnosticService[]>([]);

  const heartRateSubscription =
    useRef<Subscription | null>(null);

  const rscSubscription =
    useRef<Subscription | null>(null);

  const cyclingSubscription =
    useRef<Subscription | null>(null);

  useEffect(() => {
    return () => {
      heartRateSubscription.current?.remove();
      rscSubscription.current?.remove();
      cyclingSubscription.current?.remove();

      bleManager.stopDeviceScan();
      bleManager.destroy();
    };
  }, [bleManager]);

  const shortUuid = (uuid: string) => {
    const upper = uuid.toUpperCase();

    if (
      upper.startsWith("0000") &&
      upper.includes("-0000-1000-8000-00805F9B34FB")
    ) {
      return upper.substring(4, 8);
    }

    return upper;
  };

  const serviceName = (uuid: string) => {
    const short = shortUuid(uuid);

    switch (short) {
      case "180D":
        return "Heart Rate";
      case "1814":
        return "Running Speed & Cadence";
      case "1818":
        return "Cycling Power";
      case "1826":
        return "Fitness Machine (FTMS)";
      case "180A":
        return "Device Information";
      case "180F":
        return "Battery";
      case "1800":
        return "Generic Access";
      case "1801":
        return "Generic Attribute";
      default:
        return "Unknown / Vendor specific";
    }
  };

  const scanForDevices = () => {
    bleManager.stopDeviceScan();

    setDevices([]);
    setIsScanning(true);

    bleManager.startDeviceScan(
      null,
      null,
      (error, device) => {
        if (error) {
          console.log("BLE scan error:", error);
          setIsScanning(false);
          return;
        }

        if (!device) return;

        const name =
          device.name || device.localName;

        if (!name) return;

        setDevices((current) => {
          const existing =
            current.findIndex(
              (item) => item.id === device.id
            );

          if (existing >= 0) {
            const updated = [...current];
            updated[existing] = device;
            return updated;
          }

          return [...current, device];
        });
      }
    );

    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
    }, 10000);
  };

  const decodeHeartRate = (
    value: string
  ) => {
    const bytes = Uint8Array.from(
      atob(value),
      (c) => c.charCodeAt(0)
    );

    const flags = bytes[0];
    const is16Bit = (flags & 0x01) !== 0;

    return is16Bit
      ? bytes[1] | (bytes[2] << 8)
      : bytes[1];
  };

  const decodeRscMeasurement = (
    value: string
  ) => {
    const bytes = Uint8Array.from(
      atob(value),
      (c) => c.charCodeAt(0)
    );

    if (bytes.length < 4) return;

    const flags = bytes[0];

    const strideLengthPresent =
      (flags & (1 << 0)) !== 0;

    const totalDistancePresent =
      (flags & (1 << 1)) !== 0;

    const isRunning =
      (flags & (1 << 2)) !== 0;

    const rawSpeed =
      bytes[1] | (bytes[2] << 8);

    const speedMs =
      rawSpeed / 256;

    const speedKmh =
      speedMs * 3.6;

    const cadence =
      bytes[3];

    setRunningSpeedKmh(speedKmh);
    setRunningCadence(cadence);
    setRunningStatus(
      isRunning ? "running" : "walking"
    );

    let offset = 4;

    if (
      strideLengthPresent &&
      bytes.length >= offset + 2
    ) {
      const rawStride =
        bytes[offset] |
        (bytes[offset + 1] << 8);

      setStrideLength(
        rawStride / 100
      );

      offset += 2;
    } else {
      setStrideLength(null);
    }

    if (
      totalDistancePresent &&
      bytes.length >= offset + 4
    ) {
      const rawDistance =
        bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24);

      setTotalDistance(
        rawDistance / 10
      );
    } else {
      setTotalDistance(null);
    }
  };

  const decodeCyclingPower = (
    value: string
  ) => {
    const bytes = Uint8Array.from(
      atob(value),
      (c) => c.charCodeAt(0)
    );

    if (bytes.length < 4) return;

    const flags =
      bytes[0] |
      (bytes[1] << 8);

    const rawPower =
      bytes[2] |
      (bytes[3] << 8);

    const watts =
      rawPower & 0x8000
        ? rawPower - 0x10000
        : rawPower;

    setPower(watts);

    const crankDataPresent =
      (flags & (1 << 5)) !== 0;

    setCyclingCadenceDetected(
      crankDataPresent
    );
  };

  const buildDiagnostics = async (
    device: Device
  ) => {
    const services: Service[] =
      await device.services();

    const result: DiagnosticService[] = [];

    for (const service of services) {
      let characteristics:
        Characteristic[] = [];

      try {
        characteristics =
          await service.characteristics();
      } catch (error) {
        console.log(
          "Characteristic read error:",
          error
        );
      }

      result.push({
        uuid: service.uuid,
        name: serviceName(
          service.uuid
        ),

        characteristics:
          characteristics.map((c) => ({
            uuid: c.uuid,

            readable:
              c.isReadable === true,

            notifiable:
              c.isNotifiable === true,

            indicatable:
              c.isIndicatable === true,

            writable:
              c.isWritableWithResponse === true ||
              c.isWritableWithoutResponse ===
                true,
          })),
      });
    }

    setDiagnostics(result);

    return services;
  };

  const connectToDevice = async (
    device: Device
  ) => {
    try {
      bleManager.stopDeviceScan();

      setIsScanning(false);
      setIsConnecting(true);

      setCapabilities([]);

      setHeartRate(null);

      setRunningSpeedKmh(null);
      setRunningCadence(null);
      setRunningStatus(null);
      setStrideLength(null);
      setTotalDistance(null);

      setPower(null);
      setCyclingCadenceDetected(false);

      setDiagnostics([]);

      heartRateSubscription.current?.remove();
      rscSubscription.current?.remove();
      cyclingSubscription.current?.remove();

      if (connectedDevice) {
        try {
          await bleManager.cancelDeviceConnection(
            connectedDevice.id
          );
        } catch {}
      }

      const connected =
        await device.connect();

      const discovered =
        await connected.discoverAllServicesAndCharacteristics();

      setConnectedDevice(discovered);

      const services =
        await buildDiagnostics(
          discovered
        );

      const serviceUuids =
        services.map((service) =>
          shortUuid(service.uuid)
        );

      const detectedCapabilities:
        Capability[] = [];

      const hasHeartRate =
        serviceUuids.includes(
          HEART_RATE_SERVICE
        );

      const hasRsc =
        serviceUuids.includes(
          RUNNING_SPEED_CADENCE_SERVICE
        );

      const hasCyclingPower =
        serviceUuids.includes(
          CYCLING_POWER_SERVICE
        );

      const hasFitnessMachine =
        serviceUuids.includes(
          FITNESS_MACHINE_SERVICE
        );

      if (hasHeartRate) {
        detectedCapabilities.push(
          "heart-rate"
        );
      }

      if (hasRsc) {
        detectedCapabilities.push(
          "running-speed-cadence"
        );
      }

      if (hasCyclingPower) {
        detectedCapabilities.push(
          "cycling-power"
        );
      }

      if (hasFitnessMachine) {
        detectedCapabilities.push(
          "fitness-machine"
        );
      }

      setCapabilities(
        detectedCapabilities
      );

      if (hasHeartRate) {
        heartRateSubscription.current =
          discovered.monitorCharacteristicForService(
            HEART_RATE_SERVICE,
            HEART_RATE_MEASUREMENT,
            (error, characteristic) => {
              if (error) {
                console.log(
                  "Heart rate error:",
                  error
                );
                return;
              }

              if (!characteristic?.value)
                return;

              setHeartRate(
                decodeHeartRate(
                  characteristic.value
                )
              );
            }
          );
      }

      if (hasRsc) {
        rscSubscription.current =
          discovered.monitorCharacteristicForService(
            RUNNING_SPEED_CADENCE_SERVICE,
            RSC_MEASUREMENT,
            (error, characteristic) => {
              if (error) {
                console.log(
                  "RSC error:",
                  error
                );
                return;
              }

              if (!characteristic?.value)
                return;

              decodeRscMeasurement(
                characteristic.value
              );
            }
          );
      }

      if (hasCyclingPower) {
        cyclingSubscription.current =
          discovered.monitorCharacteristicForService(
            CYCLING_POWER_SERVICE,
            CYCLING_POWER_MEASUREMENT,
            (error, characteristic) => {
              if (error) {
                console.log(
                  "Cycling power error:",
                  error
                );
                return;
              }

              if (!characteristic?.value)
                return;

              decodeCyclingPower(
                characteristic.value
              );
            }
          );
      }
    } catch (error) {
      console.log(
        "Connection error:",
        error
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      heartRateSubscription.current?.remove();
      rscSubscription.current?.remove();
      cyclingSubscription.current?.remove();

      if (connectedDevice) {
        await bleManager.cancelDeviceConnection(
          connectedDevice.id
        );
      }
    } catch (error) {
      console.log(
        "Disconnect error:",
        error
      );
    }

    setConnectedDevice(null);
    setCapabilities([]);

    setHeartRate(null);

    setRunningSpeedKmh(null);
    setRunningCadence(null);
    setRunningStatus(null);
    setStrideLength(null);
    setTotalDistance(null);

    setPower(null);
    setCyclingCadenceDetected(false);

    setDiagnostics([]);
  };

  const hasCapability = (
    capability: Capability
  ) =>
    capabilities.includes(
      capability
    );

  const sortedDevices =
    [...devices].sort(
      (a, b) =>
        (b.rssi ?? -999) -
        (a.rssi ?? -999)
    );

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <View
          style={
            styles.brandHeader
          }
        >
          <Text
            style={styles.brandName}
          >
            Friskis & Svettis
          </Text>

          <View
            style={styles.titleRow}
          >
            <Text
              style={styles.title}
            >
              Training Player Pro
            </Text>

            <View
              style={styles.betaBadge}
            >
              <Text
                style={
                  styles.betaBadgeText
                }
              >
                PRO BETA
              </Text>
            </View>
          </View>

          <Text
            style={styles.subtitle}
          >
            Device Manager
          </Text>
        </View>

        <Pressable
          style={[
            styles.scanButton,
            isScanning &&
              styles.disabledButton,
          ]}
          onPress={scanForDevices}
          disabled={isScanning}
        >
          <Text
            style={
              styles.scanButtonText
            }
          >
            {isScanning
              ? "Scanning..."
              : "Scan for devices"}
          </Text>
        </Pressable>

        {connectedDevice && (
          <View
            style={
              styles.connectedCard
            }
          >
            <Text
              style={
                styles.connectedLabel
              }
            >
              CONNECTED
            </Text>

            <Text
              style={
                styles.connectedName
              }
            >
              {connectedDevice.name ||
                connectedDevice.localName ||
                "Unknown device"}
            </Text>

            <Text
              style={
                styles.capabilitiesTitle
              }
            >
              Capabilities
            </Text>

            {capabilities.length ===
            0 ? (
              <Text
                style={
                  styles.capabilityUnknown
                }
              >
                No known standard
                capabilities detected
              </Text>
            ) : (
              <>
                {hasCapability(
                  "heart-rate"
                ) && (
                  <Text
                    style={
                      styles.capability
                    }
                  >
                    ✓ Heart Rate
                  </Text>
                )}

                {hasCapability(
                  "running-speed-cadence"
                ) && (
                  <Text
                    style={
                      styles.capability
                    }
                  >
                    ✓ Running Speed &
                    Cadence
                  </Text>
                )}

                {hasCapability(
                  "cycling-power"
                ) && (
                  <Text
                    style={
                      styles.capability
                    }
                  >
                    ✓ Cycling Power
                  </Text>
                )}

                {hasCapability(
                  "fitness-machine"
                ) && (
                  <Text
                    style={
                      styles.capability
                    }
                  >
                    ✓ Fitness Machine
                    / FTMS
                  </Text>
                )}
              </>
            )}

            <Text
              style={
                styles.liveDataTitle
              }
            >
              Live data
            </Text>

            {heartRate !== null && (
              <Text
                style={styles.bigValue}
              >
                ❤️ {heartRate} bpm
              </Text>
            )}

            {hasCapability(
              "running-speed-cadence"
            ) && (
              <View
                style={
                  styles.metricGroup
                }
              >
                <Text
                  style={
                    styles.metricValue
                  }
                >
                  🏃{" "}
                  {runningSpeedKmh !==
                  null
                    ? runningSpeedKmh.toFixed(
                        1
                      )
                    : "--"}{" "}
                  km/h
                </Text>

                <Text
                  style={
                    styles.metricValue
                  }
                >
                  👣{" "}
                  {runningCadence ??
                    "--"}{" "}
                  spm
                </Text>

                {runningStatus && (
                  <Text
                    style={
                      styles.metricSub
                    }
                  >
                    Status:{" "}
                    {runningStatus}
                  </Text>
                )}

                {strideLength !==
                  null && (
                  <Text
                    style={
                      styles.metricSub
                    }
                  >
                    Stride length:{" "}
                    {strideLength.toFixed(
                      2
                    )}{" "}
                    m
                  </Text>
                )}

                {totalDistance !==
                  null && (
                  <Text
                    style={
                      styles.metricSub
                    }
                  >
                    Distance:{" "}
                    {totalDistance.toFixed(
                      1
                    )}{" "}
                    m
                  </Text>
                )}
              </View>
            )}

            {power !== null && (
              <Text
                style={styles.bigValue}
              >
                ⚡ {power} W
              </Text>
            )}

            {hasCapability(
              "cycling-power"
            ) && (
              <Text
                style={
                  styles.secondaryValue
                }
              >
                Cycling cadence:{" "}
                {cyclingCadenceDetected
                  ? "data detected ✓"
                  : "not detected"}
              </Text>
            )}

            <Pressable
              style={
                styles.disconnectButton
              }
              onPress={disconnect}
            >
              <Text
                style={
                  styles.disconnectText
                }
              >
                Disconnect
              </Text>
            </Pressable>
          </View>
        )}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Found devices (
          {sortedDevices.length})
        </Text>

        {isConnecting && (
          <Text
            style={
              styles.connectingText
            }
          >
            Connecting...
          </Text>
        )}

        {sortedDevices.map(
          (item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                connectToDevice(item)
              }
              style={
                styles.deviceCard
              }
            >
              <View
                style={
                  styles.deviceInfo
                }
              >
                <Text
                  style={
                    styles.deviceName
                  }
                >
                  {item.name ||
                    item.localName}
                </Text>

                <Text
                  style={
                    styles.deviceHint
                  }
                >
                  Tap to connect
                </Text>

                <Text
                  style={
                    styles.deviceId
                  }
                >
                  {item.id}
                </Text>
              </View>

              <Text
                style={styles.rssi}
              >
                {item.rssi ?? "?"} dBm
              </Text>
            </Pressable>
          )
        )}

        {connectedDevice && (
          <>
            <Text
              style={
                styles.diagnosticsTitle
              }
            >
              Device Diagnostics
            </Text>

            {diagnostics.map(
              (service) => (
                <View
                  key={service.uuid}
                  style={
                    styles.serviceCard
                  }
                >
                  <Text
                    style={
                      styles.serviceName
                    }
                  >
                    {service.name}
                  </Text>

                  <Text
                    style={
                      styles.serviceUuid
                    }
                  >
                    Service:{" "}
                    {shortUuid(
                      service.uuid
                    )}
                  </Text>

                  {service.characteristics.map(
                    (
                      characteristic
                    ) => (
                      <View
                        key={
                          characteristic.uuid
                        }
                        style={
                          styles.characteristic
                        }
                      >
                        <Text
                          style={
                            styles.characteristicUuid
                          }
                        >
                          ↳{" "}
                          {shortUuid(
                            characteristic.uuid
                          )}
                        </Text>

                        <Text
                          style={
                            styles.characteristicFlags
                          }
                        >
                          {characteristic.readable &&
                            "Read "}
                          {characteristic.notifiable &&
                            "Notify "}
                          {characteristic.indicatable &&
                            "Indicate "}
                          {characteristic.writable &&
                            "Write "}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              )
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#ffffff",
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 60,
    },

    brandHeader: {
      marginTop: 24,
      marginBottom: 24,
    },

    brandName: {
      fontSize: 14,
      fontWeight: "700",
      color: "#E31836",
      marginBottom: 6,
    },

    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 12,
    },

    title: {
      fontSize: 30,
      fontWeight: "700",
      flexShrink: 1,
    },

    betaBadge: {
      backgroundColor: "#E31836",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },

    betaBadgeText: {
      color: "#ffffff",
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
    },

    subtitle: {
      fontSize: 18,
      color: "#666666",
      marginTop: 4,
    },

    scanButton: {
      backgroundColor: "#E31836",
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 20,
    },

    disabledButton: {
      opacity: 0.5,
    },

    scanButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },

    connectedCard: {
      backgroundColor: "#f2f2f2",
      borderRadius: 14,
      padding: 18,
      marginBottom: 24,
    },

    connectedLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: "#E31836",
    },

    connectedName: {
      fontSize: 20,
      fontWeight: "700",
      marginTop: 3,
    },

    capabilitiesTitle: {
      fontSize: 14,
      fontWeight: "700",
      marginTop: 16,
      marginBottom: 6,
    },

    capability: {
      fontSize: 15,
      marginTop: 3,
    },

    capabilityUnknown: {
      fontSize: 14,
      color: "#666666",
    },

    liveDataTitle: {
      fontSize: 14,
      fontWeight: "700",
      marginTop: 20,
      marginBottom: 4,
    },

    bigValue: {
      fontSize: 34,
      fontWeight: "700",
      marginTop: 10,
    },

    metricGroup: {
      marginTop: 8,
    },

    metricValue: {
      fontSize: 24,
      fontWeight: "700",
      marginTop: 6,
    },

    metricSub: {
      fontSize: 14,
      color: "#666666",
      marginTop: 4,
    },

    secondaryValue: {
      fontSize: 16,
      fontWeight: "600",
      marginTop: 8,
    },

    disconnectButton: {
      backgroundColor: "#dddddd",
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 18,
    },

    disconnectText: {
      fontWeight: "600",
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 8,
    },

    connectingText: {
      color: "#666666",
      marginBottom: 8,
    },

    deviceCard: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: "#eeeeee",
    },

    deviceInfo: {
      flex: 1,
      paddingRight: 10,
    },

    deviceName: {
      fontSize: 16,
      fontWeight: "500",
    },

    deviceHint: {
      fontSize: 13,
      color: "#444444",
      marginTop: 3,
    },

    deviceId: {
      fontSize: 11,
      color: "#999999",
      marginTop: 4,
    },

    rssi: {
      fontSize: 13,
      color: "#666666",
    },

    diagnosticsTitle: {
      fontSize: 22,
      fontWeight: "700",
      marginTop: 34,
      marginBottom: 12,
    },

    serviceCard: {
      backgroundColor: "#f6f6f6",
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
    },

    serviceName: {
      fontSize: 16,
      fontWeight: "700",
    },

    serviceUuid: {
      fontSize: 12,
      color: "#666666",
      marginTop: 3,
      marginBottom: 8,
    },

    characteristic: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      paddingVertical: 4,
    },

    characteristicUuid: {
      fontSize: 12,
      fontFamily: "Courier",
      flex: 1,
      paddingRight: 8,
    },

    characteristicFlags: {
      fontSize: 11,
      color: "#666666",
    },
  });