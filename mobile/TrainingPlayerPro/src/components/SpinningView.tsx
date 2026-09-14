import {
  useEffect,
  useMemo,
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

/*
 * Sätt false för standalone.
 * Sätt true för mockad Pro-session.
 */
const MOCK_PRO_SESSION = true;

/*
 * Tillfälligt FTP-värde.
 * Senare kommer detta från användarprofilen.
 */
const MOCK_FTP = 200;

type CrankState = {
  cumulativeRevolutions: number;
  lastEventTime: number;
};

type ProBlock = {
  id: string;
  title: string;
  instruction: string;
  durationSeconds: number;
  targetFtpMin: number;
  targetFtpMax: number;
  targetRpmMin: number;
  targetRpmMax: number;
  color: string;
};

const mockBlocks: ProBlock[] = [
  {
    id: "1",
    title: "Uppvärmning",
    instruction: "Hitta rytmen",
    durationSeconds: 180,
    targetFtpMin: 50,
    targetFtpMax: 60,
    targetRpmMin: 75,
    targetRpmMax: 85,
    color: "#5576A8",
  },
  {
    id: "2",
    title: "Tempo",
    instruction: "Sittande – jämnt tryck",
    durationSeconds: 240,
    targetFtpMin: 70,
    targetFtpMax: 80,
    targetRpmMin: 80,
    targetRpmMax: 90,
    color: "#55A07C",
  },
  {
    id: "3",
    title: "Backe",
    instruction: "Öka motståndet",
    durationSeconds: 180,
    targetFtpMin: 85,
    targetFtpMax: 95,
    targetRpmMin: 60,
    targetRpmMax: 70,
    color: "#D3A642",
  },
  {
    id: "4",
    title: "Intervall",
    instruction: "Stark och kontrollerad",
    durationSeconds: 150,
    targetFtpMin: 100,
    targetFtpMax: 115,
    targetRpmMin: 85,
    targetRpmMax: 100,
    color: "#C86748",
  },
  {
    id: "5",
    title: "Återhämtning",
    instruction: "Lätta på motståndet",
    durationSeconds: 120,
    targetFtpMin: 50,
    targetFtpMax: 60,
    targetRpmMin: 70,
    targetRpmMax: 80,
    color: "#7F638F",
  },
];

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

  const [sessionElapsed, setSessionElapsed] =
    useState(0);

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

                  if (
                    (flags &
                      (1 << 0)) !==
                    0
                  ) {
                    offset += 1;
                  }

                  if (
                    (flags &
                      (1 << 2)) !==
                    0
                  ) {
                    offset += 2;
                  }

                  if (
                    (flags &
                      (1 << 4)) !==
                    0
                  ) {
                    offset += 6;
                  }

                  if (
                    (flags &
                      (1 << 5)) !==
                      0 &&
                    bytes.length >=
                      offset + 4
                  ) {
                    const cumulativeRevolutions =
                      bytes[offset] |
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

  /*
   * MOCKAD PRO-KLOCKA
   *
   * Viktigt:
   * detta är INTE samma timer som
   * användarens egen träningsregistrering.
   */
  useEffect(() => {
    if (!MOCK_PRO_SESSION) {
      return;
    }

    const timer =
      setInterval(() => {
        setSessionElapsed(
          (current) =>
            current + 1
        );
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

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

  const currentFtpPercent =
    powerWatts !== null &&
    MOCK_FTP > 0
      ? Math.round(
          (powerWatts /
            MOCK_FTP) *
            100
        )
      : null;

  const totalSessionSeconds =
    useMemo(
      () =>
        mockBlocks.reduce(
          (sum, block) =>
            sum +
            block.durationSeconds,
          0
        ),
      []
    );

  const sessionPosition =
    sessionElapsed %
    totalSessionSeconds;

  const sessionInfo =
    useMemo(() => {
      let accumulated = 0;

      for (
        let index = 0;
        index <
        mockBlocks.length;
        index++
      ) {
        const block =
          mockBlocks[index];

        const blockEnd =
          accumulated +
          block.durationSeconds;

        if (
          sessionPosition <
          blockEnd
        ) {
          const elapsedInBlock =
            sessionPosition -
            accumulated;

          return {
            block,
            index,
            elapsedInBlock,
            remainingInBlock:
              block.durationSeconds -
              elapsedInBlock,
          };
        }

        accumulated =
          blockEnd;
      }

      return {
        block: mockBlocks[0],
        index: 0,
        elapsedInBlock: 0,
        remainingInBlock:
          mockBlocks[0]
            .durationSeconds,
      };
    }, [sessionPosition]);

  if (MOCK_PRO_SESSION) {
    return (
      <ProSessionView
        onBack={onBack}
        live={
          anySensorConnected
        }
        equipmentName={
          equipmentName
        }
        pulseDeviceName={
          pulseDeviceName
        }
        bikeConnected={
          bikeConnected
        }
        pulseConnected={
          pulseConnected
        }
        currentBlock={
          sessionInfo.block
        }
        currentBlockIndex={
          sessionInfo.index
        }
        blockRemaining={
          sessionInfo.remainingInBlock
        }
        sessionElapsed={
          sessionElapsed
        }
        powerWatts={
          powerWatts
        }
        cadenceRpm={
          cadenceRpm
        }
        heartRate={
          heartRate
        }
        currentFtpPercent={
          currentFtpPercent
        }
        activityState={
          activityState
        }
        elapsedSeconds={
          elapsedSeconds
        }
        startTraining={
          startTraining
        }
        stopTraining={
          stopTraining
        }
      />
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
              {currentFtpPercent ??
                "--"}
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
              FTP
            </Text>

            <Text
              style={
                styles.ftpDescription
              }
            >
              Mockvärde: {MOCK_FTP} W
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

/*
 * PRO-PASS
 */
function ProSessionView({
  onBack,
  live,
  equipmentName,
  pulseDeviceName,
  bikeConnected,
  pulseConnected,
  currentBlock,
  currentBlockIndex,
  blockRemaining,
  sessionElapsed,
  powerWatts,
  cadenceRpm,
  heartRate,
  currentFtpPercent,
  activityState,
  elapsedSeconds,
  startTraining,
  stopTraining,
}: {
  onBack: () => void;
  live: boolean;
  equipmentName: string | null;
  pulseDeviceName: string | null;
  bikeConnected: boolean;
  pulseConnected: boolean;
  currentBlock: ProBlock;
  currentBlockIndex: number;
  blockRemaining: number;
  sessionElapsed: number;
  powerWatts: number | null;
  cadenceRpm: number | null;
  heartRate: number | null;
  currentFtpPercent:
    | number
    | null;
  activityState:
    | "idle"
    | "recording"
    | "finished";
  elapsedSeconds: number;
  startTraining: () => void;
  stopTraining: () => void;
}) {
  return (
    <SafeAreaView
      style={styles.container}
    >
      <View
        style={
          styles.proScreenContent
        }
      >
        <TopBar
          onBack={onBack}
          live={live}
        />

        <ProHeader
          title="Spinning"
          subtitle="Training Player Pro"
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
            styles.proTimeRow
          }
        >
          <View>
            <Text
              style={
                styles.smallLabel
              }
            >
              KVAR I BLOCK
            </Text>

            <Text
              style={
                styles.blockTime
              }
            >
              {formatTrainingTime(
                blockRemaining
              )}
            </Text>
          </View>

          <View
            style={
              styles.sessionTimeArea
            }
          >
            <Text
              style={
                styles.smallLabel
              }
            >
              PASSTID
            </Text>

            <Text
              style={
                styles.sessionTime
              }
            >
              {formatTrainingTime(
                sessionElapsed
              )}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.profileRow
          }
        >
          {mockBlocks.map(
            (block, index) => (
              <View
                key={block.id}
                style={[
                  styles.profileSegment,
                  {
                    flex:
                      block.durationSeconds,
                    backgroundColor:
                      block.color,
                    opacity:
                      index ===
                      currentBlockIndex
                        ? 1
                        : 0.35,
                  },
                ]}
              />
            )
          )}
        </View>

        <View
          style={[
            styles.blockCard,
            {
              borderTopColor:
                currentBlock.color,
            },
          ]}
        >
          <Text
            style={
              styles.blockEyebrow
            }
          >
            AKTUELLT BLOCK
          </Text>

          <Text
            style={
              styles.blockTitle
            }
          >
            {currentBlock.title}
          </Text>

          <Text
            style={
              styles.blockInstruction
            }
          >
            {
              currentBlock.instruction
            }
          </Text>

          <View
            style={
              styles.targetsRow
            }
          >
            <Target
              label="MÅL %FTP"
              value={`${currentBlock.targetFtpMin}–${currentBlock.targetFtpMax}`}
            />

            <Target
              label="MÅL RPM"
              value={`${currentBlock.targetRpmMin}–${currentBlock.targetRpmMax}`}
            />
          </View>
        </View>

        <View
          style={
            styles.proMetrics
          }
        >
          <MainMetric
            label="%FTP"
            value={
              currentFtpPercent !==
              null
                ? String(
                    currentFtpPercent
                  )
                : "--"
            }
            unit="%"
          />

          <View
            style={
              styles.metricDivider
            }
          />

          <MainMetric
            label="RPM"
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
          style={
            styles.secondaryMetrics
          }
        >
          <View>
            <Text
              style={
                styles.secondaryLabel
              }
            >
              EFFEKT
            </Text>

            <Text
              style={
                styles.secondaryValue
              }
            >
              {powerWatts !== null
                ? `${powerWatts} W`
                : "-- W"}
            </Text>
          </View>

          <View
            style={
              styles.secondaryRight
            }
          >
            <Text
              style={
                styles.secondaryLabel
              }
            >
              DIN TRÄNING
            </Text>

            <Text
              style={
                styles.secondaryValue
              }
            >
              {activityState ===
              "recording"
                ? formatTrainingTime(
                    elapsedSeconds
                  )
                : "Inte startad"}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.proBottom
          }
        >
          {activityState ===
          "recording" ? (
            <Pressable
              style={
                styles.proStopButton
              }
              onPress={
                stopTraining
              }
            >
              <Text
                style={
                  styles.proStopText
                }
              >
                Stoppa registrering
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={
                styles.proStartButton
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
                Starta registrering
              </Text>
            </Pressable>
          )}
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
          {live
            ? "LIVE"
            : "VÄNTAR"}
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
        style={styles.metricLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.metricValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      <Text
        style={styles.metricUnit}
      >
        {unit}
      </Text>
    </View>
  );
}

function Target({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.target}>
      <Text
        style={
          styles.targetLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.targetValue
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

    proScreenContent: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },

    topBar: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginBottom: 16,
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
      marginTop: 16,
    },

    sensorCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor: "#18181b",
      borderRadius: 15,
      paddingHorizontal: 14,
      paddingVertical: 10,
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
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.2,
    },

    sensorValue: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "700",
      marginTop: 4,
    },

    proTimeRow: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "flex-end",
      marginTop: 19,
    },

    smallLabel: {
      color: "#77777d",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.5,
    },

    blockTime: {
      color: "#ffffff",
      fontSize: 42,
      lineHeight: 46,
      fontWeight: "800",
      fontVariant: [
        "tabular-nums",
      ],
    },

    sessionTimeArea: {
      alignItems: "flex-end",
      paddingBottom: 4,
    },

    sessionTime: {
      color: "#d0d0d4",
      fontSize: 20,
      fontWeight: "700",
      marginTop: 3,
      fontVariant: [
        "tabular-nums",
      ],
    },

    profileRow: {
      flexDirection: "row",
      height: 12,
      gap: 3,
      marginTop: 13,
    },

    profileSegment: {
      borderRadius: 4,
    },

    blockCard: {
      backgroundColor: "#18181b",
      borderRadius: 20,
      padding: 17,
      marginTop: 13,
      borderTopWidth: 4,
    },

    blockEyebrow: {
      color: "#89898f",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.4,
    },

    blockTitle: {
      color: "#ffffff",
      fontSize: 25,
      fontWeight: "800",
      marginTop: 3,
    },

    blockInstruction: {
      color: "#99999f",
      fontSize: 13,
      marginTop: 2,
    },

    targetsRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 14,
    },

    target: {
      flex: 1,
      backgroundColor: "#222225",
      borderRadius: 13,
      padding: 11,
    },

    targetLabel: {
      color: "#77777c",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1,
    },

    targetValue: {
      color: "#ffffff",
      fontSize: 22,
      fontWeight: "800",
      marginTop: 2,
    },

    proMetrics: {
      flexDirection: "row",
      backgroundColor: "#18181b",
      borderRadius: 20,
      marginTop: 11,
      paddingVertical: 14,
      paddingHorizontal: 5,
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
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.2,
    },

    metricValue: {
      color: "#ffffff",
      fontSize: 36,
      lineHeight: 40,
      fontWeight: "800",
      marginTop: 2,
      maxWidth: "100%",
    },

    metricUnit: {
      color: "#8e8e94",
      fontSize: 9,
      fontWeight: "700",
    },

    secondaryMetrics: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      backgroundColor: "#141416",
      borderRadius: 14,
      padding: 12,
      marginTop: 8,
    },

    secondaryRight: {
      alignItems: "flex-end",
    },

    secondaryLabel: {
      color: "#6d6d72",
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 1,
    },

    secondaryValue: {
      color: "#d2d2d6",
      fontSize: 13,
      fontWeight: "700",
      marginTop: 2,
    },

    proBottom: {
      marginTop: "auto",
      paddingTop: 8,
    },

    proStartButton: {
      backgroundColor: "#E31836",
      borderRadius: 17,
      alignItems: "center",
      paddingVertical: 15,
    },

    proStopButton: {
      backgroundColor: "#ffffff",
      borderRadius: 17,
      alignItems: "center",
      paddingVertical: 15,
    },

    proStopText: {
      color: "#111111",
      fontSize: 16,
      fontWeight: "800",
    },

    timeSection: {
      alignItems: "center",
      marginTop: 25,
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
      fontSize: 16,
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
  });