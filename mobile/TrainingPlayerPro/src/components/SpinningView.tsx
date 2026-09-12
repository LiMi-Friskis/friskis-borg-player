import {
  useEffect,
  useRef,
  useState,
} from "react";

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

import {
  TrainingSetup,
} from "./DeviceManager";

import {
  useHeartRate,
} from "../hooks/useHeartRate";

import {
  formatTrainingTime,
  useTrainingSession,
} from "../hooks/useTrainingSession";

import ProHeader from "./pro/ProHeader";

type Props = {
  setup: TrainingSetup;
  onBack: () => void;
};

const CYCLING_POWER_SERVICE =
  "1818";

const CYCLING_POWER_MEASUREMENT =
  "2A63";

type CrankState = {
  cumulativeRevolutions: number;
  lastEventTime: number;
};

export default function SpinningView({
  setup,
  onBack,
}: Props) {
  const {
    heartRate,
    heartRateStatus,
  } = useHeartRate(setup);

  const [powerWatts, setPowerWatts] =
    useState<number | null>(null);

  const [cadenceRpm, setCadenceRpm] =
    useState<number | null>(null);

  const [bikeStatus, setBikeStatus] =
    useState<
      | "not-connected"
      | "connecting"
      | "connected"
      | "error"
    >(
      setup.equipment
        ? "connecting"
        : "not-connected"
    );

  /*
   * Senare kommer detta från den aktiva
   * Training Player Pro-sessionen.
   *
   * Just nu kör vi standalone.
   */
  const hasProSession = false;

  const powerSubscription =
    useRef<Subscription | null>(
      null
    );

  const previousCrank =
    useRef<CrankState | null>(
      null
    );

  const {
    activityState,
    elapsedSeconds,
    summary,
    startTraining,
    stopTraining,
  } = useTrainingSession({
    heartRate,
    speedKmh: null,
    distanceKm: null,
    powerWatts,
    cadenceRpm,
  });

  /*
   * BODY BIKE
   * Cycling Power Service
   */
  useEffect(() => {
    const startCyclingPower =
      async () => {
        if (!setup.equipment) {
          setBikeStatus(
            "not-connected"
          );
          return;
        }

        const deviceId =
          setup.equipment.device.id;

        try {
          setBikeStatus(
            "connecting"
          );

          powerSubscription.current?.remove();

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

          powerSubscription.current =
            setup.manager.monitorCharacteristicForDevice(
              deviceId,
              CYCLING_POWER_SERVICE,
              CYCLING_POWER_MEASUREMENT,
              (
                error,
                characteristic
              ) => {
                if (error) {
                  console.log(
                    "Cycling power monitor error:",
                    error
                  );

                  setBikeStatus(
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
                    bytes.length < 4
                  ) {
                    return;
                  }

                  const flags =
                    bytes[0] |
                    (bytes[1] << 8);

                  let offset = 2;

                  /*
                   * Instantaneous Power
                   * signed int16
                   */
                  let rawPower =
                    bytes[offset] |
                    (bytes[
                      offset + 1
                    ] << 8);

                  if (
                    rawPower & 0x8000
                  ) {
                    rawPower -=
                      0x10000;
                  }

                  setPowerWatts(
                    rawPower
                  );

                  offset += 2;

                  // Pedal Power Balance
                  if (
                    (flags &
                      (1 << 0)) !==
                    0
                  ) {
                    offset += 1;
                  }

                  // Accumulated Torque
                  if (
                    (flags &
                      (1 << 2)) !==
                    0
                  ) {
                    offset += 2;
                  }

                  // Wheel Revolution Data
                  if (
                    (flags &
                      (1 << 4)) !==
                    0
                  ) {
                    offset += 6;
                  }

                  /*
                   * Crank Revolution Data
                   * används för RPM.
                   */
                  if (
                    (flags &
                      (1 << 5)) !==
                      0 &&
                    bytes.length >=
                      offset + 4
                  ) {
                    const cumulativeRevolutions =
                      bytes[
                        offset
                      ] |
                      (bytes[
                        offset + 1
                      ] << 8);

                    const lastEventTime =
                      bytes[
                        offset + 2
                      ] |
                      (bytes[
                        offset + 3
                      ] << 8);

                    const previous =
                      previousCrank.current;

                    if (previous) {
                      let revolutionDelta =
                        cumulativeRevolutions -
                        previous.cumulativeRevolutions;

                      if (
                        revolutionDelta <
                        0
                      ) {
                        revolutionDelta +=
                          65536;
                      }

                      let timeDelta =
                        lastEventTime -
                        previous.lastEventTime;

                      if (
                        timeDelta < 0
                      ) {
                        timeDelta +=
                          65536;
                      }

                      if (
                        revolutionDelta >
                          0 &&
                        timeDelta > 0
                      ) {
                        const seconds =
                          timeDelta /
                          1024;

                        const rpm =
                          (revolutionDelta /
                            seconds) *
                          60;

                        if (
                          rpm >= 0 &&
                          rpm < 250
                        ) {
                          setCadenceRpm(
                            rpm
                          );
                        }
                      }
                    }

                    previousCrank.current =
                      {
                        cumulativeRevolutions,
                        lastEventTime,
                      };
                  }

                  setBikeStatus(
                    "connected"
                  );
                } catch (error) {
                  console.log(
                    "Cycling power decode error:",
                    error
                  );
                }
              }
            );

          setBikeStatus(
            "connected"
          );
        } catch (error) {
          console.log(
            "Could not start cycling power:",
            error
          );

          setBikeStatus("error");
        }
      };

    startCyclingPower();

    return () => {
      powerSubscription.current?.remove();

      previousCrank.current =
        null;
    };
  }, [
    setup.equipment,
    setup.manager,
  ]);

  const equipmentName =
    setup.equipment
      ? setup.equipment.device.name ||
        setup.equipment.device
          .localName ||
        "Body Bike"
      : null;

  const pulseDeviceName =
    setup.heartRateDevice
      ? setup.heartRateDevice.device
          .name ||
        setup.heartRateDevice.device
          .localName ||
        "Pulsmätare"
      : null;

  const bikeConnected =
    bikeStatus === "connected";

  const pulseConnected =
    heartRateStatus ===
    "connected";

  const anySensorConnected =
    bikeConnected ||
    pulseConnected;

  /*
   * När vi senare ansluter till
   * instruktörspasset hamnar Pro-layouten
   * här.
   */
  if (hasProSession) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={
            styles.proPlaceholder
          }
        >
          <Text
            style={
              styles.proPlaceholderText
            }
          >
            Pro-pass anslutet
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * AVSLUTAD TRÄNING
   *
   * Ersätter träningsvyn i stället för
   * att läggas under den. Därmed krävs
   * ingen scrollning.
   */
  if (
    activityState === "finished"
  ) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={
            styles.screenContent
          }
        >
          <TopBar
            onBack={onBack}
            live={
              anySensorConnected
            }
          />

          <ProHeader
            title="Spinning"
            subtitle="Träningen avslutad"
          />

          <View
            style={
              styles.finishedHeader
            }
          >
            <Text
              style={
                styles.smallLabel
              }
            >
              TRÄNINGSTID
            </Text>

            <Text
              style={
                styles.finishedTime
              }
            >
              {formatTrainingTime(
                elapsedSeconds
              )}
            </Text>
          </View>

          <View
            style={
              styles.summaryCard
            }
          >
            <Text
              style={
                styles.summaryEyebrow
              }
            >
              SAMMANFATTNING
            </Text>

            <SummaryRow
              label="Snittpuls"
              value={
                summary.averageHeartRate !==
                null
                  ? `${Math.round(
                      summary.averageHeartRate
                    )} bpm`
                  : "--"
              }
            />

            <SummaryRow
              label="Maxpuls"
              value={
                summary.maxHeartRate !==
                null
                  ? `${summary.maxHeartRate} bpm`
                  : "--"
              }
            />

            <SummaryRow
              label="Snitteffekt"
              value={
                summary.averagePower !==
                null
                  ? `${Math.round(
                      summary.averagePower
                    )} W`
                  : "--"
              }
            />

            <SummaryRow
              label="Maxeffekt"
              value={
                summary.maxPower !==
                null
                  ? `${Math.round(
                      summary.maxPower
                    )} W`
                  : "--"
              }
            />

            <SummaryRow
              label="Snittkadens"
              value={
                summary.averageCadence !==
                null
                  ? `${Math.round(
                      summary.averageCadence
                    )} RPM`
                  : "--"
              }
              last
            />
          </View>

          <View
            style={
              styles.finishedMetrics
            }
          >
            <CompactMetric
              label="WATT NU"
              value={
                powerWatts !== null
                  ? `${powerWatts}`
                  : "--"
              }
              unit="W"
            />

            <CompactMetric
              label="RPM NU"
              value={
                cadenceRpm !== null
                  ? `${Math.round(
                      cadenceRpm
                    )}`
                  : "--"
              }
              unit="RPM"
            />

            <CompactMetric
              label="PULS NU"
              value={
                heartRate !== null
                  ? `${heartRate}`
                  : "--"
              }
              unit="BPM"
            />
          </View>

          <View
            style={
              styles.bottomArea
            }
          >
            <Pressable
              style={
                styles.primaryButton
              }
              onPress={
                startTraining
              }
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Starta ny träning
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * STANDALONE
   */
  return (
    <SafeAreaView
      style={styles.container}
    >
      <View
        style={styles.screenContent}
      >
        <TopBar
          onBack={onBack}
          live={
            anySensorConnected
          }
        />

        <ProHeader
          title="Spinning"
          subtitle={
            activityState ===
            "recording"
              ? "Träning pågår"
              : "Fristående träning"
          }
        />

        <View
          style={styles.sensorRow}
        >
          <SensorCard
            label="CYKEL"
            value={
              equipmentName ??
              "Ej ansluten"
            }
            connected={
              bikeConnected
            }
          />

          <SensorCard
            label="PULS"
            value={
              pulseDeviceName ??
              "Ej ansluten"
            }
            connected={
              pulseConnected
            }
          />
        </View>

        <View
          style={
            styles.timeSection
          }
        >
          <Text
            style={
              styles.smallLabel
            }
          >
            TRÄNINGSTID
          </Text>

          <Text
            style={
              styles.trainingTime
            }
          >
            {formatTrainingTime(
              elapsedSeconds
            )}
          </Text>

          <Text
            style={
              styles.activityStatus
            }
          >
            {activityState ===
            "recording"
              ? "TRÄNING PÅGÅR"
              : "REDO"}
          </Text>
        </View>

        <View
          style={styles.mainMetrics}
        >
          <MainMetric
            label="EFFEKT"
            value={
              powerWatts !== null
                ? String(powerWatts)
                : "--"
            }
            unit="W"
          />

          <View
            style={
              styles.metricDivider
            }
          />

          <MainMetric
            label="KADENS"
            value={
              cadenceRpm !== null
                ? String(
                    Math.round(
                      cadenceRpm
                    )
                  )
                : "--"
            }
            unit="RPM"
          />

          <View
            style={
              styles.metricDivider
            }
          />

          <MainMetric
            label="PULS"
            value={
              heartRate !== null
                ? String(heartRate)
                : "--"
            }
            unit="BPM"
          />
        </View>

        <View
          style={styles.ftpRow}
        >
          <View>
            <Text
              style={
                styles.smallLabel
              }
            >
              AKTUELL %FTP
            </Text>

            <Text
              style={
                styles.ftpValue
              }
            >
              --
            </Text>
          </View>

          <View
            style={
              styles.ftpTextArea
            }
          >
            <Text
              style={
                styles.ftpTitle
              }
            >
              FTP inte inställt
            </Text>

            <Text
              style={
                styles.ftpDescription
              }
            >
              Lägg till FTP senare för
              att visa aktuell
              intensitet i procent.
            </Text>
          </View>
        </View>

        <View
          style={styles.bottomArea}
        >
          {activityState ===
          "recording" ? (
            <Pressable
              style={
                styles.stopButton
              }
              onPress={
                stopTraining
              }
            >
              <Text
                style={
                  styles.stopButtonText
                }
              >
                Stoppa träning
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={
                styles.primaryButton
              }
              onPress={
                startTraining
              }
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Starta träning
              </Text>
            </Pressable>
          )}

          <Pressable
            style={
              styles.joinButton
            }
          >
            <Text
              style={
                styles.joinButtonText
              }
            >
              Anslut till pass
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function TopBar({
  onBack,
  live,
}: {
  onBack: () => void;
  live: boolean;
}) {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
      >
        <Text style={styles.back}>
          ‹ Avsluta
        </Text>
      </Pressable>

      <View
        style={[
          styles.liveBadge,
          live &&
            styles.liveBadgeActive,
        ]}
      >
        <View
          style={[
            styles.liveDot,
            live &&
              styles.liveDotActive,
          ]}
        />

        <Text
          style={styles.liveText}
        >
          {live ? "LIVE" : "VÄNTAR"}
        </Text>
      </View>
    </View>
  );
}

function SensorCard({
  label,
  value,
  connected,
}: {
  label: string;
  value: string;
  connected: boolean;
}) {
  return (
    <View
      style={styles.sensorCard}
    >
      <View
        style={
          styles.sensorLabelRow
        }
      >
        <View
          style={[
            styles.sensorDot,
            connected &&
              styles.sensorDotActive,
          ]}
        />

        <Text
          style={
            styles.sensorLabel
          }
        >
          {label}
        </Text>
      </View>

      <Text
        style={
          styles.sensorValue
        }
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function MainMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View
      style={styles.mainMetric}
    >
      <Text
        style={
          styles.metricLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.metricValue
        }
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      <Text
        style={
          styles.metricUnit
        }
      >
        {unit}
      </Text>
    </View>
  );
}

function CompactMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View
      style={
        styles.compactMetric
      }
    >
      <Text
        style={
          styles.compactMetricLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.compactMetricValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.compactMetricUnit
        }
      >
        {unit}
      </Text>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryRow,
        last &&
          styles.summaryRowLast,
      ]}
    >
      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#0b0b0d",
    },

    screenContent: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 14,
    },

    topBar: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginBottom: 18,
    },

    back: {
      color: "#cacace",
      fontSize: 17,
      fontWeight: "600",
    },

    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: "#202023",
    },

    liveBadgeActive: {
      backgroundColor: "#16261b",
    },

    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: "#66666b",
    },

    liveDotActive: {
      backgroundColor: "#48c968",
    },

    liveText: {
      color: "#ffffff",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 2,
    },

    sensorRow: {
      flexDirection: "row",
      gap: 9,
      marginTop: 20,
    },

    sensorCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor: "#18181b",
      borderRadius: 17,
      paddingHorizontal: 15,
      paddingVertical: 12,
    },

    sensorLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    sensorDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: "#65656a",
    },

    sensorDotActive: {
      backgroundColor: "#48c968",
    },

    sensorLabel: {
      color: "#77777d",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
    },

    sensorValue: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "700",
      marginTop: 5,
    },

    timeSection: {
      alignItems: "center",
      marginTop: 25,
    },

    smallLabel: {
      color: "#77777d",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.6,
    },

    trainingTime: {
      color: "#ffffff",
      fontSize: 57,
      lineHeight: 63,
      fontWeight: "800",
      marginTop: 2,
      fontVariant: [
        "tabular-nums",
      ],
    },

    activityStatus: {
      color: "#E31836",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.6,
      marginTop: 1,
    },

    mainMetrics: {
      flexDirection: "row",
      backgroundColor: "#18181b",
      borderRadius: 22,
      marginTop: 22,
      paddingVertical: 20,
      paddingHorizontal: 6,
    },

    mainMetric: {
      flex: 1,
      alignItems: "center",
      minWidth: 0,
    },

    metricDivider: {
      width: 1,
      backgroundColor: "#303034",
      marginVertical: 3,
    },

    metricLabel: {
      color: "#85858b",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.3,
    },

    metricValue: {
      color: "#ffffff",
      fontSize: 40,
      lineHeight: 47,
      fontWeight: "800",
      marginTop: 5,
      maxWidth: "100%",
    },

    metricUnit: {
      color: "#8e8e94",
      fontSize: 10,
      fontWeight: "700",
      marginTop: 1,
    },

    ftpRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#151517",
      borderRadius: 18,
      padding: 15,
      marginTop: 10,
    },

    ftpValue: {
      color: "#ffffff",
      fontSize: 31,
      fontWeight: "800",
      marginTop: 2,
    },

    ftpTextArea: {
      flex: 1,
      paddingLeft: 25,
    },

    ftpTitle: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "700",
    },

    ftpDescription: {
      color: "#717176",
      fontSize: 11,
      lineHeight: 15,
      marginTop: 2,
    },

    bottomArea: {
      marginTop: "auto",
    },

    primaryButton: {
      backgroundColor: "#E31836",
      borderRadius: 18,
      alignItems: "center",
      paddingVertical: 17,
    },

    primaryButtonText: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "800",
    },

    stopButton: {
      backgroundColor: "#ffffff",
      borderRadius: 18,
      alignItems: "center",
      paddingVertical: 17,
    },

    stopButtonText: {
      color: "#111111",
      fontSize: 17,
      fontWeight: "800",
    },

    joinButton: {
      alignItems: "center",
      paddingVertical: 13,
      marginTop: 3,
    },

    joinButtonText: {
      color: "#98989d",
      fontSize: 14,
      fontWeight: "700",
    },

    finishedHeader: {
      alignItems: "center",
      marginTop: 28,
    },

    finishedTime: {
      color: "#ffffff",
      fontSize: 52,
      fontWeight: "800",
      fontVariant: [
        "tabular-nums",
      ],
      marginTop: 3,
    },

    summaryCard: {
      backgroundColor: "#18181b",
      borderRadius: 22,
      padding: 18,
      marginTop: 22,
    },

    summaryEyebrow: {
      color: "#E31836",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.4,
      marginBottom: 7,
    },

    summaryRow: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: "#2a2a2e",
      paddingVertical: 9,
    },

    summaryRowLast: {
      borderBottomWidth: 0,
    },

    summaryLabel: {
      color: "#96969b",
      fontSize: 14,
    },

    summaryValue: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: "700",
    },

    finishedMetrics: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
    },

    compactMetric: {
      flex: 1,
      backgroundColor: "#151517",
      borderRadius: 15,
      padding: 12,
      alignItems: "center",
    },

    compactMetricLabel: {
      color: "#717176",
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 0.8,
    },

    compactMetricValue: {
      color: "#ffffff",
      fontSize: 25,
      fontWeight: "800",
      marginTop: 3,
    },

    compactMetricUnit: {
      color: "#747479",
      fontSize: 9,
      fontWeight: "700",
    },

    proPlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    proPlaceholderText: {
      color: "#ffffff",
      fontSize: 20,
      fontWeight: "700",
    },
  });