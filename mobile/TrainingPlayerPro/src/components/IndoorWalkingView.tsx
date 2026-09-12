import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Subscription,
} from "@sfourdrinier/react-native-ble-plx";

import { TrainingSetup } from "./DeviceManager";

type Props = {
  setup: TrainingSetup;
  onBack: () => void;
};

const HEART_RATE_SERVICE = "180D";
const HEART_RATE_MEASUREMENT = "2A37";

const FTMS_SERVICE = "1826";
const TREADMILL_DATA = "2ACD";

type ActivityState =
  | "idle"
  | "recording"
  | "finished";

export default function IndoorWalkingView({
  setup,
  onBack,
}: Props) {
  const [heartRate, setHeartRate] =
    useState<number | null>(null);

  const [heartRateStatus, setHeartRateStatus] =
    useState<
      "not-connected" | "connecting" | "connected" | "error"
    >(
      setup.heartRateDevice
        ? "connecting"
        : "not-connected"
    );

  const [speedKmh, setSpeedKmh] =
    useState<number | null>(null);

  const [distanceKm, setDistanceKm] =
    useState<number | null>(null);

  const [ftmsStatus, setFtmsStatus] =
    useState<
      "not-connected" | "connecting" | "connected" | "error"
    >(
      setup.equipment
        ? "connecting"
        : "not-connected"
    );

  const [activityState, setActivityState] =
    useState<ActivityState>("idle");

  const [elapsedSeconds, setElapsedSeconds] =
    useState(0);

  const heartRateSubscription =
    useRef<Subscription | null>(null);

  const ftmsSubscription =
    useRef<Subscription | null>(null);

  const activityTimer =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  useEffect(() => {
    const startHeartRate = async () => {
      if (!setup.heartRateDevice) {
        setHeartRateStatus("not-connected");
        return;
      }

      const deviceId =
        setup.heartRateDevice.device.id;

      try {
        setHeartRateStatus("connecting");

        heartRateSubscription.current?.remove();

        let connected =
          await setup.manager.isDeviceConnected(
            deviceId
          );

        if (!connected) {
          await setup.manager.connectToDevice(
            deviceId
          );
        }

        await setup.manager.discoverAllServicesAndCharacteristicsForDevice(
          deviceId
        );

        setHeartRateStatus("connected");

        heartRateSubscription.current =
          setup.manager.monitorCharacteristicForDevice(
            deviceId,
            HEART_RATE_SERVICE,
            HEART_RATE_MEASUREMENT,
            (error, characteristic) => {
              if (error) {
                console.log(
                  "Heart rate monitor error:",
                  error
                );

                setHeartRateStatus("error");
                return;
              }

              if (!characteristic?.value) {
                return;
              }

              const bytes =
                Uint8Array.from(
                  atob(characteristic.value),
                  (c) =>
                    c.charCodeAt(0)
                );

              if (bytes.length < 2) {
                return;
              }

              const flags = bytes[0];
              const is16Bit =
                (flags & 0x01) !== 0;

              const bpm =
                is16Bit
                  ? bytes[1] |
                    (bytes[2] << 8)
                  : bytes[1];

              setHeartRate(bpm);
            }
          );
      } catch (error) {
        console.log(
          "Could not start heart rate:",
          error
        );

        setHeartRateStatus("error");
      }
    };

    startHeartRate();

    return () => {
      heartRateSubscription.current?.remove();
    };
  }, [
    setup.heartRateDevice,
    setup.manager,
  ]);

  useEffect(() => {
    const startFtms = async () => {
      if (!setup.equipment) {
        setFtmsStatus("not-connected");
        return;
      }

      const deviceId =
        setup.equipment.device.id;

      try {
        setFtmsStatus("connecting");

        ftmsSubscription.current?.remove();

        let connected =
          await setup.manager.isDeviceConnected(
            deviceId
          );

        if (!connected) {
          await setup.manager.connectToDevice(
            deviceId
          );
        }

        await setup.manager.discoverAllServicesAndCharacteristicsForDevice(
          deviceId
        );

        setFtmsStatus("connected");

        ftmsSubscription.current =
          setup.manager.monitorCharacteristicForDevice(
            deviceId,
            FTMS_SERVICE,
            TREADMILL_DATA,
            (error, characteristic) => {
              if (error) {
                console.log(
                  "FTMS monitor error:",
                  error
                );

                setFtmsStatus("error");
                return;
              }

              if (!characteristic?.value) {
                return;
              }

              const bytes =
                Uint8Array.from(
                  atob(characteristic.value),
                  (c) =>
                    c.charCodeAt(0)
                );

              if (bytes.length < 4) {
                return;
              }

              // FTMS Treadmill Data
              // Flags: 2 bytes, little endian
              const flags =
                bytes[0] |
                (bytes[1] << 8);

              let offset = 2;

              // Instantaneous Speed
              // uint16, 0.01 km/h
              const rawSpeed =
                bytes[offset] |
                (bytes[offset + 1] << 8);

              setSpeedKmh(
                rawSpeed / 100
              );

              offset += 2;

              // Average Speed present
              if (
                (flags & (1 << 1)) !== 0
              ) {
                offset += 2;
              }

              // Total Distance present
              if (
                (flags & (1 << 2)) !== 0 &&
                bytes.length >=
                  offset + 3
              ) {
                const rawDistance =
                  bytes[offset] |
                  (bytes[offset + 1] << 8) |
                  (bytes[offset + 2] << 16);

                // FTMS Total Distance = meters
                setDistanceKm(
                  rawDistance / 1000
                );

                offset += 3;
              }
            }
          );
      } catch (error) {
        console.log(
          "Could not start FTMS:",
          error
        );

        setFtmsStatus("error");
      }
    };

    startFtms();

    return () => {
      ftmsSubscription.current?.remove();
    };
  }, [
    setup.equipment,
    setup.manager,
  ]);

  useEffect(() => {
    if (
      activityState === "recording"
    ) {
      activityTimer.current =
        setInterval(() => {
          setElapsedSeconds(
            (current) =>
              current + 1
          );
        }, 1000);
    } else {
      if (activityTimer.current) {
        clearInterval(
          activityTimer.current
        );

        activityTimer.current =
          null;
      }
    }

    return () => {
      if (activityTimer.current) {
        clearInterval(
          activityTimer.current
        );
      }
    };
  }, [activityState]);

  const startTraining = () => {
    setElapsedSeconds(0);
    setActivityState("recording");
  };

  const stopTraining = () => {
    setActivityState("finished");
  };

  const formatTime = (
    totalSeconds: number
  ) => {
    const minutes = Math.floor(
      totalSeconds / 60
    );

    const seconds =
      totalSeconds % 60;

    return `${String(
      minutes
    ).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  };

  const pulseDeviceName =
    setup.heartRateDevice
      ? setup.heartRateDevice.device
          .name ||
        setup.heartRateDevice.device
          .localName ||
        "Pulsmätare"
      : null;

  const equipmentName =
    setup.equipment
      ? setup.equipment.device.name ||
        setup.equipment.device.localName ||
        "Indoor Walking"
      : null;

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.content}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>
            ‹ Avsluta
          </Text>
        </Pressable>

        <Text style={styles.brand}>
          Friskis
        </Text>

        <Text style={styles.title}>
          Indoor Walking
        </Text>

        <Text
          style={styles.deviceText}
        >
          {equipmentName
            ? `Maskin: ${equipmentName}`
            : "Ingen maskin ansluten"}
        </Text>

        <Text
          style={styles.deviceText}
        >
          {pulseDeviceName
            ? `Puls: ${pulseDeviceName}`
            : "Ingen pulsmätare ansluten"}
        </Text>

        {equipmentName && (
          <Text
            style={[
              styles.connectionStatus,
              ftmsStatus ===
                "connected" &&
                styles.statusConnected,
              ftmsStatus ===
                "error" &&
                styles.statusError,
            ]}
          >
            {ftmsStatus ===
              "connecting" &&
              "Ansluter till maskin..."}

            {ftmsStatus ===
              "connected" &&
              "● Maskin ansluten"}

            {ftmsStatus ===
              "error" &&
              "Kunde inte läsa maskindata"}
          </Text>
        )}

        {pulseDeviceName && (
          <Text
            style={[
              styles.connectionStatus,
              heartRateStatus ===
                "connected" &&
                styles.statusConnected,
              heartRateStatus ===
                "error" &&
                styles.statusError,
            ]}
          >
            {heartRateStatus ===
              "connecting" &&
              "Ansluter till puls..."}

            {heartRateStatus ===
              "connected" &&
              "● Puls ansluten"}

            {heartRateStatus ===
              "error" &&
              "Kunde inte läsa puls"}
          </Text>
        )}

        {activityState !==
          "idle" && (
          <View
            style={styles.timerArea}
          >
            <Text
              style={styles.timerLabel}
            >
              TRÄNINGSTID
            </Text>

            <Text
              style={styles.timerValue}
            >
              {formatTime(
                elapsedSeconds
              )}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>
            {activityState ===
            "recording"
              ? "Tränar"
              : activityState ===
                "finished"
              ? "Träningen avslutad"
              : "Redo att träna"}
          </Text>

          <Text style={styles.value}>
            🏃{" "}
            {speedKmh !== null
              ? speedKmh.toFixed(1)
              : "--"}{" "}
            km/h
          </Text>

          <Text style={styles.value}>
            📏{" "}
            {distanceKm !== null
              ? distanceKm.toFixed(2)
              : "--"}{" "}
            km
          </Text>

          <Text style={styles.value}>
            ❤️{" "}
            {heartRate !== null
              ? `${heartRate} bpm`
              : "-- bpm"}
          </Text>
        </View>

        {activityState !==
          "recording" ? (
          <Pressable
            style={styles.startButton}
            onPress={startTraining}
          >
            <Text
              style={
                styles.startButtonText
              }
            >
              {activityState ===
              "finished"
                ? "Starta ny träning"
                : "Starta träning"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.stopButton}
            onPress={stopTraining}
          >
            <Text
              style={
                styles.stopButtonText
              }
            >
              Stoppa träning
            </Text>
          </Pressable>
        )}

        <Text
          style={styles.sessionText}
        >
          Inget pass anslutet
        </Text>

        <Pressable
          style={styles.sessionButton}
        >
          <Text
            style={
              styles.sessionButtonText
            }
          >
            Sök aktivt pass
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#ffffff",
    },

    content: {
      flex: 1,
      padding: 24,
    },

    back: {
      fontSize: 16,
      marginBottom: 24,
    },

    brand: {
      color: "#E31836",
      fontWeight: "700",
    },

    title: {
      fontSize: 34,
      fontWeight: "700",
      marginTop: 4,
    },

    deviceText: {
      color: "#666666",
      marginTop: 6,
    },

    connectionStatus: {
      fontSize: 13,
      color: "#777777",
      marginTop: 8,
    },

    statusConnected: {
      color: "#28A745",
      fontWeight: "600",
    },

    statusError: {
      color: "#E31836",
      fontWeight: "600",
    },

    timerArea: {
      alignItems: "center",
      marginTop: 22,
    },

    timerLabel: {
      fontSize: 11,
      color: "#777777",
      fontWeight: "700",
      letterSpacing: 1,
    },

    timerValue: {
      fontSize: 38,
      fontWeight: "700",
      marginTop: 3,
    },

    card: {
      backgroundColor: "#f3f3f3",
      borderRadius: 16,
      padding: 20,
      marginTop: 24,
    },

    label: {
      fontSize: 14,
      fontWeight: "700",
    },

    value: {
      fontSize: 30,
      fontWeight: "700",
      marginTop: 10,
    },

    startButton: {
      backgroundColor: "#E31836",
      borderRadius: 14,
      alignItems: "center",
      paddingVertical: 17,
      marginTop: 24,
    },

    startButtonText: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "700",
    },

    stopButton: {
      backgroundColor: "#111111",
      borderRadius: 14,
      alignItems: "center",
      paddingVertical: 17,
      marginTop: 24,
    },

    stopButtonText: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "700",
    },

    sessionText: {
      textAlign: "center",
      color: "#777777",
      marginTop: 28,
    },

    sessionButton: {
      alignItems: "center",
      paddingVertical: 14,
    },

    sessionButtonText: {
      color: "#E31836",
      fontWeight: "700",
    },
  });