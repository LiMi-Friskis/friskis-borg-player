import {
  useEffect,
  useRef,
  useState,
} from "react";

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
  Device,
} from "@sfourdrinier/react-native-ble-plx";

import {
  useUserProfile,
} from "@/context/UserProfileContext";

export type Capability =
  | "heart-rate"
  | "running-speed-cadence"
  | "cycling-power"
  | "fitness-machine";

export type TrainingMode =
  | "spinning"
  | "indoor-walking";

export type ConnectedDevice = {
  device: Device;
  capabilities: Capability[];
};

export type TrainingSetup = {
  mode: TrainingMode;
  equipment: ConnectedDevice | null;
  heartRateDevice: ConnectedDevice | null;
  manager: BleManager;
};

type Props = {
  onReady: (
    setup: TrainingSetup
  ) => void;

  onBack: () => void;

  initialMode?: TrainingMode | null;

  proPassName?: string | null;
};

const HEART_RATE_SERVICE =
  "180D";

const RSC_SERVICE =
  "1814";

const CYCLING_POWER_SERVICE =
  "1818";

const FTMS_SERVICE =
  "1826";

export default function DeviceManager({
  onReady,
  onBack,
  initialMode = null,
  proPassName = null,
}: Props) {
  const {
    profile,
  } = useUserProfile();

  const manager =
    useRef(
      new BleManager()
    ).current;

  const [
    devices,
    setDevices,
  ] = useState<Device[]>([]);

  const [
    scanning,
    setScanning,
  ] = useState(false);

  const [
    connectingId,
    setConnectingId,
  ] = useState<string | null>(
    null
  );

  const [
    equipment,
    setEquipment,
  ] =
    useState<ConnectedDevice | null>(
      null
    );

  const [
    heartRateDevice,
    setHeartRateDevice,
  ] =
    useState<ConnectedDevice | null>(
      null
    );

  const [
    selectedMode,
    setSelectedMode,
  ] =
    useState<TrainingMode | null>(
      initialMode
    );

  const [
    showOtherDevices,
    setShowOtherDevices,
  ] = useState(false);

  const scanTimer =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  const shortUuid = (
    uuid: string
  ) => {
    const upper =
      uuid.toUpperCase();

    if (
      upper.startsWith(
        "0000"
      ) &&
      upper.includes(
        "-0000-1000-8000-00805F9B34FB"
      )
    ) {
      return upper.substring(
        4,
        8
      );
    }

    return upper;
  };

  function scan() {
    manager.stopDeviceScan();

    if (scanTimer.current) {
      clearTimeout(
        scanTimer.current
      );
    }

    setDevices([]);
    setScanning(true);

    manager.startDeviceScan(
      null,
      null,
      (
        error,
        device
      ) => {
        if (error) {
          console.log(
            "BLE scan error:",
            error
          );

          setScanning(false);
          return;
        }

        if (!device) {
          return;
        }

        const name =
          device.name ||
          device.localName;

        if (!name) {
          return;
        }

        setDevices(
          (current) => {
            const index =
              current.findIndex(
                (item) =>
                  item.id ===
                  device.id
              );

            if (
              index >= 0
            ) {
              const copy =
                [...current];

              copy[index] =
                device;

              return copy;
            }

            return [
              ...current,
              device,
            ];
          }
        );
      }
    );

    scanTimer.current =
      setTimeout(() => {
        manager.stopDeviceScan();
        setScanning(false);
      }, 10000);
  }

  useEffect(() => {
    const timer =
      setTimeout(() => {
        scan();
      }, 250);

    return () => {
      clearTimeout(timer);

      if (
        scanTimer.current
      ) {
        clearTimeout(
          scanTimer.current
        );
      }

      manager.stopDeviceScan();
    };
  }, []);

  const advertisedCapabilities =
    (
      device: Device
    ): Capability[] => {
      const advertised =
        device.serviceUUIDs?.map(
          shortUuid
        ) ?? [];

      const result:
        Capability[] = [];

      if (
        advertised.includes(
          HEART_RATE_SERVICE
        )
      ) {
        result.push(
          "heart-rate"
        );
      }

      if (
        advertised.includes(
          RSC_SERVICE
        )
      ) {
        result.push(
          "running-speed-cadence"
        );
      }

      if (
        advertised.includes(
          CYCLING_POWER_SERVICE
        )
      ) {
        result.push(
          "cycling-power"
        );
      }

      if (
        advertised.includes(
          FTMS_SERVICE
        )
      ) {
        result.push(
          "fitness-machine"
        );
      }

      return result;
    };

  const looksRelevant = (
    device: Device
  ) => {
    const capabilities =
      advertisedCapabilities(
        device
      );

    if (
      capabilities.length >
      0
    ) {
      return true;
    }

    const name = (
      device.name ||
      device.localName ||
      ""
    ).toLowerCase();

    return (
      name.includes("body") ||
      name.includes("bike") ||
      name.includes(
        "fenix"
      ) ||
      name.includes(
        "garmin"
      ) ||
      name.includes(
        "polar"
      ) ||
      name.includes(
        "wahoo"
      ) ||
      name.includes(
        "heart"
      ) ||
      name.includes(
        "hrm"
      ) ||
      name.includes(
        "walking"
      ) ||
      name.includes(
        "tread"
      ) ||
      name.includes(
        "fitness"
      )
    );
  };

  const discoverCapabilities =
    async (
      device: Device
    ): Promise<ConnectedDevice> => {
      const alreadyConnected =
        await device.isConnected();

      const connected =
        alreadyConnected
          ? device
          : await device.connect();

      const discovered =
        await connected.discoverAllServicesAndCharacteristics();

      const services =
        await discovered.services();

      const uuids =
        services.map(
          (service) =>
            shortUuid(
              service.uuid
            )
        );

      const capabilities:
        Capability[] = [];

      if (
        uuids.includes(
          HEART_RATE_SERVICE
        )
      ) {
        capabilities.push(
          "heart-rate"
        );
      }

      if (
        uuids.includes(
          RSC_SERVICE
        )
      ) {
        capabilities.push(
          "running-speed-cadence"
        );
      }

      if (
        uuids.includes(
          CYCLING_POWER_SERVICE
        )
      ) {
        capabilities.push(
          "cycling-power"
        );
      }

      if (
        uuids.includes(
          FTMS_SERVICE
        )
      ) {
        capabilities.push(
          "fitness-machine"
        );
      }

      return {
        device: discovered,
        capabilities,
      };
    };

  const disconnectDevice =
    async (
      connected:
        | ConnectedDevice
        | null
    ) => {
      if (!connected) {
        return;
      }

      try {
        const isConnected =
          await connected.device.isConnected();

        if (isConnected) {
          await manager.cancelDeviceConnection(
            connected.device.id
          );
        }
      } catch (error) {
        console.log(
          "Disconnect error:",
          error
        );
      }
    };

  const connect =
    async (
      device: Device
    ) => {
      try {
        setConnectingId(
          device.id
        );

        manager.stopDeviceScan();

        const connected =
          await discoverCapabilities(
            device
          );

        const isCycling =
          connected.capabilities.includes(
            "cycling-power"
          );

        const isFtms =
          connected.capabilities.includes(
            "fitness-machine"
          );

        const isEquipment =
          isCycling ||
          isFtms;

        const isHeartRate =
          connected.capabilities.includes(
            "heart-rate"
          );

        if (isEquipment) {
          if (
            equipment &&
            equipment.device
              .id !==
              connected.device.id
          ) {
            await disconnectDevice(
              equipment
            );
          }

          setEquipment(
            connected
          );

          /*
           * För fristående träning
           * kan utrustningen hjälpa
           * oss välja aktivitet.
           *
           * För Pro-pass behåller vi
           * instruktörens aktivitet.
           */
          if (!initialMode) {
            if (
              isCycling
            ) {
              setSelectedMode(
                "spinning"
              );
            }

            if (isFtms) {
              setSelectedMode(
                "indoor-walking"
              );
            }
          }

          if (
            heartRateDevice
              ?.device.id ===
            connected.device.id
          ) {
            setHeartRateDevice(
              null
            );
          }
        } else if (
          isHeartRate
        ) {
          if (
            heartRateDevice &&
            heartRateDevice
              .device.id !==
              connected.device.id
          ) {
            await disconnectDevice(
              heartRateDevice
            );
          }

          setHeartRateDevice(
            connected
          );
        } else {
          await disconnectDevice(
            connected
          );
        }
      } catch (error) {
        console.log(
          "Connection error:",
          error
        );
      } finally {
        setConnectingId(
          null
        );

        setTimeout(() => {
          scan();
        }, 300);
      }
    };

  const removeEquipment =
    async () => {
      await disconnectDevice(
        equipment
      );

      setEquipment(null);
    };

  const removeHeartRate =
    async () => {
      await disconnectDevice(
        heartRateDevice
      );

      setHeartRateDevice(
        null
      );
    };

  const continueToTraining =
    () => {
      if (!selectedMode) {
        return;
      }

      manager.stopDeviceScan();

      if (
        scanTimer.current
      ) {
        clearTimeout(
          scanTimer.current
        );
      }

      onReady({
        mode: selectedMode,
        equipment,
        heartRateDevice,
        manager,
      });
    };

  const isSelected = (
    id: string
  ) =>
    equipment?.device.id ===
      id ||
    heartRateDevice?.device
      .id === id;

  const availableDevices =
    [...devices]
      .filter(
        (device) =>
          !isSelected(
            device.id
          )
      )
      .sort(
        (a, b) =>
          (b.rssi ?? -999) -
          (a.rssi ?? -999)
      );

  const relevantDevices =
    availableDevices.filter(
      looksRelevant
    );

  const otherDevices =
    availableDevices.filter(
      (device) =>
        !looksRelevant(
          device
        )
    );

  const deviceName = (
    connected:
      ConnectedDevice
  ) =>
    connected.device.name ||
    connected.device.localName ||
    "Okänd enhet";

  const equipmentType = (
    connected:
      ConnectedDevice
  ) => {
    if (
      connected.capabilities.includes(
        "fitness-machine"
      )
    ) {
      return "Indoor Walking";
    }

    if (
      connected.capabilities.includes(
        "cycling-power"
      )
    ) {
      return "Cykel";
    }

    return "Träningsutrustning";
  };

  const DeviceRow = ({
    device,
  }: {
    device: Device;
  }) => (
    <Pressable
      style={
        styles.deviceCard
      }
      onPress={() =>
        connect(device)
      }
      disabled={
        connectingId !==
        null
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
          {device.name ||
            device.localName}
        </Text>

        <Text
          style={
            styles.deviceHint
          }
        >
          {connectingId ===
          device.id
            ? "Identifierar enhet..."
            : "Tryck för att ansluta"}
        </Text>
      </View>

      <Text
        style={styles.rssi}
      >
        {device.rssi ?? "?"} dBm
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <Pressable
          onPress={onBack}
        >
          <Text
            style={styles.back}
          >
            ‹ Tillbaka
          </Text>
        </Pressable>

        <Text
          style={styles.brand}
        >
          Friskis
        </Text>

        <Text
          style={styles.title}
        >
          Anslut utrustning
        </Text>

        <Text
          style={styles.subtitle}
        >
          {proPassName
            ? `Du ansluter till ${proPassName}. Anslut de enheter du vill använda.`
            : "Anslut det du vill använda och välj sedan träningsform."}
        </Text>

        {(equipment ||
          heartRateDevice) && (
          <View
            style={
              styles.selectedArea
            }
          >
            <Text
              style={
                styles.selectedTitle
              }
            >
              Mina enheter
            </Text>

            {equipment && (
              <View
                style={
                  styles.selectedCard
                }
              >
                <View
                  style={
                    styles.selectedInfo
                  }
                >
                  <View
                    style={
                      styles.selectedHeader
                    }
                  >
                    <View
                      style={
                        styles.greenDot
                      }
                    />

                    <Text
                      style={
                        styles.connectedText
                      }
                    >
                      ANSLUTEN
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.selectedName
                    }
                  >
                    {deviceName(
                      equipment
                    )}
                  </Text>

                  <Text
                    style={
                      styles.selectedType
                    }
                  >
                    {equipmentType(
                      equipment
                    )}
                  </Text>
                </View>

                <Pressable
                  onPress={
                    removeEquipment
                  }
                >
                  <Text
                    style={
                      styles.removeText
                    }
                  >
                    Koppla från
                  </Text>
                </Pressable>
              </View>
            )}

            {heartRateDevice && (
              <View
                style={
                  styles.selectedCard
                }
              >
                <View
                  style={
                    styles.selectedInfo
                  }
                >
                  <View
                    style={
                      styles.selectedHeader
                    }
                  >
                    <View
                      style={
                        styles.greenDot
                      }
                    />

                    <Text
                      style={
                        styles.connectedText
                      }
                    >
                      ANSLUTEN
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.selectedName
                    }
                  >
                    {deviceName(
                      heartRateDevice
                    )}
                  </Text>

                  <Text
                    style={
                      styles.selectedType
                    }
                  >
                    Pulsmätare
                  </Text>
                </View>

                <Pressable
                  onPress={
                    removeHeartRate
                  }
                >
                  <Text
                    style={
                      styles.removeText
                    }
                  >
                    Koppla från
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <Pressable
          style={[
            styles.scanButton,
            scanning &&
              styles.scanDisabled,
          ]}
          onPress={scan}
          disabled={scanning}
        >
          <Text
            style={
              styles.scanButtonText
            }
          >
            {scanning
              ? "Söker..."
              : "Sök igen"}
          </Text>
        </Pressable>

        <Text
          style={
            styles.sectionTitle
          }
        >
          Träningsenheter (
          {
            relevantDevices.length
          }
          )
        </Text>

        {relevantDevices
          .length === 0 &&
          scanning && (
            <Text
              style={
                styles.searchText
              }
            >
              Söker efter
              träningsutrustning och
              pulsmätare…
            </Text>
          )}

        {relevantDevices.map(
          (device) => (
            <DeviceRow
              key={device.id}
              device={device}
            />
          )
        )}

        {profile.showOtherBluetoothDevices &&
          otherDevices.length >
            0 && (
          <>
            <Pressable
              style={
                styles.otherButton
              }
              onPress={() =>
                setShowOtherDevices(
                  !showOtherDevices
                )
              }
            >
              <Text
                style={
                  styles.otherButtonText
                }
              >
                {showOtherDevices
                  ? "Dölj övriga enheter"
                  : `Visa övriga enheter (${otherDevices.length})`}
              </Text>
            </Pressable>

            {showOtherDevices &&
              otherDevices.map(
                (device) => (
                  <DeviceRow
                    key={
                      device.id
                    }
                    device={
                      device
                    }
                  />
                )
              )}
          </>
        )}

        {!initialMode && (
          <View
            style={
              styles.modeSection
            }
          >
            <Text
              style={
                styles.modeTitle
              }
            >
              Välj träningsform
            </Text>

            <Pressable
              style={[
                styles.modeCard,
                selectedMode ===
                  "spinning" &&
                  styles.modeCardSelected,
              ]}
              onPress={() =>
                setSelectedMode(
                  "spinning"
                )
              }
            >
              <View>
                <Text
                  style={
                    styles.modeName
                  }
                >
                  🚴 Spinning
                </Text>

                <Text
                  style={
                    styles.modeDescription
                  }
                >
                  Cykel, effekt, RPM
                  och puls
                </Text>
              </View>

              {selectedMode ===
                "spinning" && (
                <Text
                  style={
                    styles.selectedCheck
                  }
                >
                  ✓
                </Text>
              )}
            </Pressable>

            {profile.showIndoorWalking && (
            <Pressable
              style={[
                styles.modeCard,
                selectedMode ===
                  "indoor-walking" &&
                  styles.modeCardSelected,
              ]}
              onPress={() =>
                setSelectedMode(
                  "indoor-walking"
                )
              }
            >
              <View>
                <Text
                  style={
                    styles.modeName
                  }
                >
                  🏃 Indoor Walking
                </Text>

                <Text
                  style={
                    styles.modeDescription
                  }
                >
                  Hastighet,
                  distans och puls
                </Text>
              </View>

              {selectedMode ===
                "indoor-walking" && (
                <Text
                  style={
                    styles.selectedCheck
                  }
                >
                  ✓
                </Text>
              )}
            </Pressable>
            )}
          </View>
        )}

        <Pressable
          style={[
            styles.continueButton,
            !selectedMode &&
              styles.continueDisabled,
          ]}
          disabled={
            !selectedMode
          }
          onPress={
            continueToTraining
          }
        >
          <Text
            style={
              styles.continueButtonText
            }
          >
            {proPassName
              ? "Gå till passet"
              : "Fortsätt"}
          </Text>
        </Pressable>

        {proPassName && (
          <Text
            style={
              styles.optionalText
            }
          >
            Du kan fortsätta utan
            anslutna enheter.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#ffffff",
    },

    content: {
      padding: 24,
      paddingBottom: 70,
    },

    back: {
      fontSize: 16,
      marginBottom: 24,
    },

    brand: {
      color: "#E31836",
      fontWeight: "700",
      fontSize: 16,
      marginBottom: 6,
    },

    title: {
      fontSize: 30,
      fontWeight: "700",
    },

    subtitle: {
      fontSize: 17,
      color: "#666666",
      marginTop: 6,
      marginBottom: 24,
      lineHeight: 24,
    },

    selectedArea: {
      marginBottom: 20,
    },

    selectedTitle: {
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 10,
    },

    selectedCard: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      backgroundColor:
        "#f3f3f3",
      borderWidth: 2,
      borderColor: "#E31836",
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
    },

    selectedInfo: {
      flex: 1,
    },

    selectedHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    greenDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor:
        "#28A745",
    },

    connectedText: {
      color: "#28A745",
      fontSize: 11,
      fontWeight: "700",
    },

    selectedName: {
      fontSize: 18,
      fontWeight: "700",
      marginTop: 5,
    },

    selectedType: {
      color: "#666666",
      marginTop: 3,
    },

    removeText: {
      color: "#E31836",
      fontWeight: "600",
      marginLeft: 12,
    },

    scanButton: {
      backgroundColor:
        "#E31836",
      paddingVertical: 16,
      alignItems: "center",
      borderRadius: 14,
      marginBottom: 26,
    },

    scanDisabled: {
      opacity: 0.6,
    },

    scanButtonText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 16,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 8,
    },

    searchText: {
      color: "#777777",
      marginVertical: 10,
    },

    deviceCard: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        "#eeeeee",
    },

    deviceInfo: {
      flex: 1,
      paddingRight: 12,
    },

    deviceName: {
      fontSize: 16,
      fontWeight: "600",
    },

    deviceHint: {
      color: "#777777",
      marginTop: 3,
    },

    rssi: {
      color: "#777777",
    },

    otherButton: {
      marginTop: 14,
      paddingVertical: 12,
    },

    otherButtonText: {
      color: "#666666",
      fontWeight: "600",
      textAlign: "center",
    },

    modeSection: {
      marginTop: 32,
    },

    modeTitle: {
      fontSize: 22,
      fontWeight: "700",
      marginBottom: 12,
    },

    modeCard: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#dddddd",
      borderRadius: 14,
      padding: 17,
      marginBottom: 10,
    },

    modeCardSelected: {
      borderWidth: 2,
      borderColor: "#E31836",
      backgroundColor:
        "#fff5f6",
    },

    modeName: {
      fontSize: 18,
      fontWeight: "700",
    },

    modeDescription: {
      color: "#777777",
      marginTop: 4,
    },

    selectedCheck: {
      color: "#E31836",
      fontSize: 24,
      fontWeight: "700",
    },

    continueButton: {
      backgroundColor:
        "#E31836",
      borderRadius: 14,
      alignItems: "center",
      paddingVertical: 17,
      marginTop: 24,
    },

    continueDisabled: {
      opacity: 0.3,
    },

    continueButtonText: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "700",
    },

    optionalText: {
      color: "#777777",
      textAlign: "center",
      marginTop: 10,
      fontSize: 13,
    },
  });
