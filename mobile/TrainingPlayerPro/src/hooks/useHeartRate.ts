import { useEffect, useRef, useState } from "react";

import {
  Subscription,
} from "@sfourdrinier/react-native-ble-plx";

import {
  TrainingSetup,
} from "../components/DeviceManager";

const HEART_RATE_SERVICE = "180D";
const HEART_RATE_MEASUREMENT = "2A37";

export type HeartRateStatus =
  | "not-connected"
  | "connecting"
  | "connected"
  | "error";

export function useHeartRate(
  setup: TrainingSetup
) {
  const [heartRate, setHeartRate] =
    useState<number | null>(null);

  const [heartRateStatus, setHeartRateStatus] =
    useState<HeartRateStatus>(
      setup.heartRateDevice
        ? "connecting"
        : "not-connected"
    );

  const subscription =
    useRef<Subscription | null>(null);

  useEffect(() => {
    const startMonitoring = async () => {
      if (!setup.heartRateDevice) {
        setHeartRate(null);
        setHeartRateStatus(
          "not-connected"
        );
        return;
      }

      const deviceId =
        setup.heartRateDevice.device.id;

      try {
        setHeartRateStatus(
          "connecting"
        );

        subscription.current?.remove();

        const isConnected =
          await setup.manager.isDeviceConnected(
            deviceId
          );

        if (!isConnected) {
          await setup.manager.connectToDevice(
            deviceId
          );
        }

        await setup.manager.discoverAllServicesAndCharacteristicsForDevice(
          deviceId
        );

        subscription.current =
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

                setHeartRateStatus(
                  "error"
                );

                return;
              }

              if (
                !characteristic?.value
              ) {
                return;
              }

              try {
                const bytes =
                  Uint8Array.from(
                    atob(
                      characteristic.value
                    ),
                    (character) =>
                      character.charCodeAt(
                        0
                      )
                  );

                if (
                  bytes.length < 2
                ) {
                  return;
                }

                const flags =
                  bytes[0];

                const is16Bit =
                  (flags & 0x01) !==
                  0;

                if (
                  is16Bit &&
                  bytes.length < 3
                ) {
                  return;
                }

                const bpm =
                  is16Bit
                    ? bytes[1] |
                      (bytes[2] << 8)
                    : bytes[1];

                setHeartRate(bpm);

                setHeartRateStatus(
                  "connected"
                );
              } catch (error) {
                console.log(
                  "Heart rate decode error:",
                  error
                );
              }
            }
          );

        setHeartRateStatus(
          "connected"
        );
      } catch (error) {
        console.log(
          "Could not start heart rate:",
          error
        );

        setHeartRateStatus("error");
      }
    };

    startMonitoring();

    return () => {
      subscription.current?.remove();
    };
  }, [
    setup.heartRateDevice,
    setup.manager,
  ]);

  return {
    heartRate,
    heartRateStatus,
  };
}