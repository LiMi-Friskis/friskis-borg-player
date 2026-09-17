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

import {
  useLiveSession,
} from "../hooks/useLiveSession";

import {
  useActiveSessions,
} from "../hooks/useActiveSessions";

import ProHeader from "./pro/ProHeader";
import WorkoutPager from "./pro/WorkoutPager";
import WorkoutDataView from "./pro/WorkoutDataView";
import WorkoutPassPlaceholder from "./pro/WorkoutPassPlaceholder";
import WorkoutPassView from "./pro/WorkoutPassView";
import {
  useUserProfile,
} from "../context/UserProfileContext";
import {
  virtualCyclingSpeedKmh,
} from "../lib/virtualCyclingSpeed";

type Props = {
  setup: TrainingSetup;
  onBack: () => void;
  sessionId?: string | null;
};

const CYCLING_POWER_SERVICE =
  "1818";

const CYCLING_POWER_MEASUREMENT =
  "2A63";

type CrankState = {
  cumulativeRevolutions: number;
  lastEventTime: number;
};

type DisplayTarget = {
  label: string;
  value: string;
};

type DisplayBlock = {
  id: string;
  title: string;
  instruction: string;
  durationSeconds: number;
  color: string;
  targets: DisplayTarget[];
  intensityValue: number | null;
  intensityHeightPercent: number | null;
};

function numberValue(
  value: unknown
): number | null {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsed =
      Number(value);

    if (
      Number.isFinite(
        parsed
      )
    ) {
      return parsed;
    }
  }

  return null;
}

function cleanTargetLabel(
  modelName: unknown,
  unit: unknown
) {
  if (
    typeof modelName === "string" &&
    modelName.trim()
  ) {
    return modelName
      .trim()
      .toUpperCase();
  }

  if (
    typeof unit === "string" &&
    unit.trim()
  ) {
    return unit
      .replace(/%/g, "")
      .trim()
      .toUpperCase();
  }

  return "INTENSITET";
}

function buildDisplayTargets(
  rawTargets: unknown,
  intensityModel: unknown
): DisplayTarget[] {
  const targets =
    rawTargets &&
    typeof rawTargets === "object"
      ? (rawTargets as Record<
          string,
          unknown
        >)
      : {};

  const model =
    intensityModel &&
    typeof intensityModel === "object"
      ? (intensityModel as Record<
          string,
          unknown
        >)
      : {};

  const result: DisplayTarget[] = [];

  const primaryLabel =
    cleanTargetLabel(
      model.name,
      targets.unit ??
        model.unit
    );

  let primaryValue = "";

  if (
    typeof targets.intensityLabel ===
      "string" &&
    targets.intensityLabel.trim()
  ) {
    primaryValue =
      targets.intensityLabel.trim();
  } else if (
    typeof targets.intensityValue ===
      "number"
  ) {
    const unit =
      typeof targets.unit ===
        "string"
        ? targets.unit.trim()
        : "";

    primaryValue =
      `${targets.intensityValue}${
        unit.startsWith("%")
          ? "%"
          : unit
          ? ` ${unit}`
          : ""
      }`;
  }

  if (primaryValue) {
    result.push({
      label:
        `MÅL ${primaryLabel}`,
      value: primaryValue,
    });
  }

  /*
   * Framtida stöd:
   * om snapshot faktiskt innehåller
   * RPM-mål visar vi det också.
   */
  const rpmMin =
    numberValue(
      targets.rpmMin ??
        targets.targetRpmMin
    );

  const rpmMax =
    numberValue(
      targets.rpmMax ??
        targets.targetRpmMax
    );

  if (
    rpmMin !== null ||
    rpmMax !== null
  ) {
    let rpmValue = "--";

    if (
      rpmMin !== null &&
      rpmMax !== null
    ) {
      rpmValue =
        `${rpmMin}–${rpmMax}`;
    } else if (
      rpmMin !== null
    ) {
      rpmValue =
        String(rpmMin);
    } else if (
      rpmMax !== null
    ) {
      rpmValue =
        String(rpmMax);
    }

    result.push({
      label: "MÅL RPM",
      value: rpmValue,
    });
  }

  return result;
}

function firstNumber(
  object: Record<
    string,
    unknown
  >,
  keys: string[]
) {
  for (
    const key of keys
  ) {
    const value =
      numberValue(
        object[key]
      );

    if (
      value !== null
    ) {
      return value;
    }
  }

  return null;
}

function toDisplayBlock(
  raw: unknown,
  index: number,
  intensityModel: unknown
): DisplayBlock {
  const block =
    raw &&
    typeof raw === "object"
      ? (raw as Record<
          string,
          unknown
        >)
      : {};

  return {
    id:
      String(
        block.id ??
          index
      ),

    title:
      String(
        block.name ??
          block.title ??
          `Block ${
            index + 1
          }`
      ),

    instruction:
      String(
        block.description ??
          block.instruction ??
          ""
      ),

    durationSeconds:
      firstNumber(
        block,
        [
          "durationSec",
          "durationSeconds",
          "duration",
        ]
      ) ?? 0,

    color:
      typeof block.color ===
        "string"
        ? block.color
        : "#5576A8",

    targets:
      buildDisplayTargets(
        block.targets,
        intensityModel
      ),

    intensityValue:
      block.targets &&
      typeof block.targets === "object"
        ? numberValue(
            (
              block.targets as Record<
                string,
                unknown
              >
            ).intensityValue
          )
        : null,

    intensityHeightPercent:
      numberValue(
        block.intensityHeightPercent
      ),
  };
}

function rangeText(
  min: number | null,
  max: number | null
) {
  if (
    min !== null &&
    max !== null
  ) {
    return `${min}–${max}`;
  }

  if (
    min !== null
  ) {
    return String(min);
  }

  if (
    max !== null
  ) {
    return String(max);
  }

  return "--";
}

export default function SpinningView({
  setup,
  onBack,
  sessionId = null,
}: Props) {
  const {
    profile,
  } = useUserProfile();

  const {
    heartRate,
    heartRateStatus,
  } =
    useHeartRate(setup);

  const [
    powerWatts,
    setPowerWatts,
  ] =
    useState<number | null>(
      null
    );

  const [
    cadenceRpm,
    setCadenceRpm,
  ] =
    useState<number | null>(
      null
    );

  const [
    bikeStatus,
    setBikeStatus,
  ] = useState<
    | "not-connected"
    | "connecting"
    | "connected"
    | "error"
  >(
    setup.equipment
      ? "connecting"
      : "not-connected"
  );

  const powerSubscription =
    useRef<Subscription | null>(
      null
    );

  const previousCrank =
    useRef<CrankState | null>(
      null
    );

  /*
   * VIRTUAL CYCLING SPEED v0.1
   *
   * BODY BIKE ger oss watt och kadens men ingen
   * separat hastighet i den BLE-data vi använder.
   *
   * Om vi senare får riktig BLE-hastighet ska den
   * alltid prioriteras framför detta värde.
   */
  const virtualSpeedKmh =
    useMemo(
      () =>
        virtualCyclingSpeedKmh(
          powerWatts
        ),
      [powerWatts]
    );

  const [
    virtualDistanceKm,
    setVirtualDistanceKm,
  ] = useState(0);

  const {
    activityState,
    elapsedSeconds,
    summary,
    startTraining: startTrainingBase,
    stopTraining,
    resetTraining: resetTrainingBase,
  } = useTrainingSession({
    heartRate,
    speedKmh: virtualSpeedKmh,
    distanceKm: virtualDistanceKm,
    powerWatts,
    cadenceRpm,
  });

  /*
   * Integrera virtuell hastighet till distans.
   *
   * Hookens elapsedSeconds tickar en gång per sekund,
   * så varje tick motsvarar:
   *
   *   km/h / 3600 = km per sekund
   */
  const previousElapsedSeconds =
    useRef(0);

  useEffect(() => {
    if (
      activityState !== "recording"
    ) {
      previousElapsedSeconds.current =
        elapsedSeconds;
      return;
    }

    const deltaSeconds =
      elapsedSeconds -
      previousElapsedSeconds.current;

    previousElapsedSeconds.current =
      elapsedSeconds;

    if (
      deltaSeconds <= 0 ||
      virtualSpeedKmh === null
    ) {
      return;
    }

    setVirtualDistanceKm(
      (current) =>
        current +
        (virtualSpeedKmh *
          deltaSeconds) /
          3600
    );
  }, [
    activityState,
    elapsedSeconds,
    virtualSpeedKmh,
  ]);

  const startTraining = () => {
    setVirtualDistanceKm(0);
    previousElapsedSeconds.current = 0;
    startTrainingBase();
  };

  const resetTraining = () => {
    setVirtualDistanceKm(0);
    previousElapsedSeconds.current = 0;
    resetTrainingBase();
  };

  /*
   * Sessionen kan komma från två håll:
   *
   * 1. Användaren valde ett Pro-pass innan träningsvyn öppnades.
   * 2. Användaren började träna fristående och ansluter senare
   *    från Pass-vyn.
   *
   * Viktigt: SpinningView förblir monterad när sessionen ansluts.
   * Därmed fortsätter BLE och useTrainingSession utan omstart.
   */
  const [
    attachedSessionId,
    setAttachedSessionId,
  ] = useState<string | null>(
    sessionId ?? null
  );

  const {
    sessions: activeSessions,
    loading: activeSessionsLoading,
    error: activeSessionsError,
    refresh: refreshActiveSessions,
  } = useActiveSessions();

  const liveSession =
    useLiveSession(
      attachedSessionId
    );

  /*
   * BODY BIKE
   */
  useEffect(() => {
    const startCyclingPower =
      async () => {
        if (
          !setup.equipment
        ) {
          setBikeStatus(
            "not-connected"
          );
          return;
        }

        const deviceId =
          setup.equipment
            .device.id;

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
                  !characteristic
                    ?.value
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
                    bytes.length <
                    4
                  ) {
                    return;
                  }

                  const flags =
                    bytes[0] |
                    (bytes[1] <<
                      8);

                  let offset = 2;

                  let rawPower =
                    bytes[offset] |
                    (bytes[
                      offset + 1
                    ] <<
                      8);

                  if (
                    rawPower &
                    0x8000
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
                      bytes[
                        offset
                      ] |
                      (bytes[
                        offset + 1
                      ] <<
                        8);

                    const lastEventTime =
                      bytes[
                        offset + 2
                      ] |
                      (bytes[
                        offset + 3
                      ] <<
                        8);

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
                        timeDelta <
                        0
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
                          rpm >=
                            0 &&
                          rpm <
                            250
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
                } catch (
                  error
                ) {
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

          setBikeStatus(
            "error"
          );
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
      ? setup.equipment
          .device.name ||
        setup.equipment
          .device
          .localName ||
        "Body Bike"
      : null;

  const pulseDeviceName =
    setup.heartRateDevice
      ? setup
          .heartRateDevice
          .device.name ||
        setup
          .heartRateDevice
          .device.localName ||
        "Pulsmätare"
      : null;

  const bikeConnected =
    bikeStatus ===
    "connected";

  const pulseConnected =
    heartRateStatus ===
    "connected";

  const anySensorConnected =
    bikeConnected ||
    pulseConnected;

  const currentFtpPercent =
    powerWatts !== null &&
    profile.ftpWatts !== null &&
    profile.ftpWatts > 0
      ? Math.round(
          (powerWatts /
            profile.ftpWatts) *
            100
        )
      : null;

  const currentWattsPerKg =
    powerWatts !== null &&
    profile.weightKg !== null &&
    profile.weightKg > 0
      ? powerWatts /
        profile.weightKg
      : null;

  const currentMaxHeartRatePercent =
    heartRate !== null &&
    profile.maxHeartRate !== null &&
    profile.maxHeartRate > 0
      ? Math.round(
          (heartRate /
            profile.maxHeartRate) *
            100
        )
      : null;

  /*
   * PRO SESSION
   */
  const proBlocks =
    useMemo(() => {
      const rawBlocks =
        liveSession.session
          ?.pass_snapshot
          ?.blocks;

      if (
        !Array.isArray(
          rawBlocks
        )
      ) {
        return [];
      }

      return rawBlocks
        .map(
          (
            block,
            index
          ) =>
            toDisplayBlock(
              block,
              index,
              liveSession.session
                ?.pass_snapshot
                ?.intensityModel
            )
        )
        .sort(
          (a, b) => {
            const rawA =
              rawBlocks.find(
                (
                  item: any
                ) =>
                  String(
                    item?.id
                  ) === a.id
              ) as any;

            const rawB =
              rawBlocks.find(
                (
                  item: any
                ) =>
                  String(
                    item?.id
                  ) === b.id
              ) as any;

            return (
              Number(
                rawA?.order ??
                  0
              ) -
              Number(
                rawB?.order ??
                  0
              )
            );
          }
        );
    }, [
      liveSession.session,
    ]);

  const currentBlockIndex =
    Math.max(
      0,
      liveSession.session
        ?.current_block_index ??
        0
    );

  const currentBlock =
    proBlocks[
      currentBlockIndex
    ] ??
    proBlocks[0] ??
    null;

  const blockStartSeconds =
    useMemo(() => {
      let total = 0;

      for (
        let index = 0;
        index <
        currentBlockIndex;
        index++
      ) {
        total +=
          proBlocks[index]
            ?.durationSeconds ??
          0;
      }

      return total;
    }, [
      proBlocks,
      currentBlockIndex,
    ]);

  const blockElapsed =
    Math.max(
      0,
      liveSession
        .currentPositionSeconds -
        blockStartSeconds
    );

  const blockRemaining =
    currentBlock
      ? Math.max(
          0,
          currentBlock.durationSeconds -
            blockElapsed
        )
      : 0;

  if (attachedSessionId) {
    if (
      liveSession.loading
    ) {
      return (
        <StatusScreen
          onBack={onBack}
          title="Ansluter till pass…"
        />
      );
    }

    if (
      liveSession.error ||
      !liveSession.session
    ) {
      return (
        <StatusScreen
          onBack={onBack}
          title="Kunde inte ansluta"
          subtitle={
            liveSession.error ??
            "Passet kunde inte hämtas."
          }
        />
      );
    }

    const status =
      liveSession.session
        .status;

    /*
     * Deltagarens egen registrering är separat
     * från instruktörens Pro-pass.
     *
     * När deltagaren stoppar sin registrering
     * visar vi sammanfattningen även om
     * instruktörens pass fortsätter.
     */
    if (
      activityState ===
      "finished"
    ) {
      return (
        <TrainingSummaryScreen
          onBack={onBack}
          onContinue={
            resetTraining
          }
          elapsedSeconds={
            elapsedSeconds
          }
          averageHeartRate={
            summary.averageHeartRate
          }
          maxHeartRate={
            summary.maxHeartRate
          }
          averagePower={
            summary.averagePower
          }
          maxPower={
            summary.maxPower
          }
          averageCadence={
            summary.averageCadence
          }
          averageSpeed={
            summary.averageSpeed
          }
          distanceKm={
            summary.distanceKm
          }
          proSession
        />
      );
    }

    if (
      status === "ready"
    ) {
      return (
        <WaitingScreen
          onBack={onBack}
          passName={
            liveSession.session
              .pass_snapshot
              ?.name ??
            "Pro-pass"
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
          heartRate={
            heartRate
          }
          powerWatts={
            powerWatts
          }
          cadenceRpm={
            cadenceRpm
          }
        />
      );
    }

    if (
      status ===
      "countdown"
    ) {
      return (
        <CountdownScreen
          onBack={onBack}
          passName={
            liveSession.session
              .pass_snapshot
              ?.name ??
            "Pro-pass"
          }
          seconds={
            liveSession
              .countdownRemainingSeconds
          }
        />
      );
    }

    const proPassName =
      liveSession.session
        .pass_snapshot
        ?.name ??
      "Spinning";

    return (
      <WorkoutPager
        data={
          <WorkoutDataView
            elapsedSeconds={
              elapsedSeconds
            }
            powerWatts={
              powerWatts
            }
            ftpPercent={
              currentFtpPercent
            }
            wattsPerKg={
              currentWattsPerKg
            }
            cadenceRpm={
              cadenceRpm
            }
            heartRate={
              heartRate
            }
            maxHeartRatePercent={
              currentMaxHeartRatePercent
            }
            speedKmh={virtualSpeedKmh}
            distanceKm={virtualDistanceKm}
            onBack={onBack}
            live={
              status === "running" ||
              status === "paused"
            }
            statusLabel={
              status === "running" ||
              status === "paused"
                ? "LIVE"
                : "VÄNTAR"
            }
            recording={
              activityState === "recording"
            }
            onStartTraining={
              startTraining
            }
            onStopTraining={
              stopTraining
            }
          />
        }
        pro={
<ProSessionView
        onBack={onBack}
        passName={
          liveSession.session
            .pass_snapshot
            ?.name ??
          "Spinning"
        }
        sessionStatus={
          status
        }
        live={
          status ===
            "running" ||
          status ===
            "paused"
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
        blocks={proBlocks}
        currentBlock={
          currentBlock
        }
        currentBlockIndex={
          currentBlockIndex
        }
        blockRemaining={
          blockRemaining
        }
        sessionElapsed={
          liveSession
            .currentPositionSeconds
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
        }
        pass={
          <WorkoutPassView
        passName={proPassName}
        blocks={proBlocks}
        currentBlockIndex={currentBlockIndex}
        blockRemaining={blockRemaining}
        sessionElapsed={
          liveSession.currentPositionSeconds
        }
        recording={
          activityState === "recording"
        }
        onStartTraining={startTraining}
        onStopTraining={stopTraining}
        onBack={onBack}
        live={
          status === "running" ||
          status === "paused"
        }
        statusLabel={
          status === "finished"
            ? "AVSLUTAT"
            : status === "paused"
            ? "PAUS"
            : status === "running"
            ? "LIVE"
            : "VÄNTAR"
        }
      />
        }
      />
    );
  }

  /*
   * STANDALONE
   */
  if (
    activityState ===
    "finished"
  ) {
    return (
      <TrainingSummaryScreen
        onBack={onBack}
        onContinue={
          resetTraining
        }
        elapsedSeconds={
          elapsedSeconds
        }
        averageHeartRate={
          summary.averageHeartRate
        }
        maxHeartRate={
          summary.maxHeartRate
        }
        averagePower={
          summary.averagePower
        }
        maxPower={
          summary.maxPower
        }
        averageCadence={
          summary.averageCadence
        }
        averageSpeed={
          summary.averageSpeed
        }
        distanceKm={
          summary.distanceKm
        }
      />
    );
  }

  return (
    <WorkoutPager
      data={
        <WorkoutDataView
          elapsedSeconds={
            elapsedSeconds
          }
          powerWatts={
            powerWatts
          }
          ftpPercent={
            currentFtpPercent
          }
          wattsPerKg={
            currentWattsPerKg
          }
          cadenceRpm={
            cadenceRpm
          }
          heartRate={
            heartRate
          }
          maxHeartRatePercent={
            currentMaxHeartRatePercent
          }
          speedKmh={virtualSpeedKmh}
          distanceKm={virtualDistanceKm}
          onBack={onBack}
          live={
            anySensorConnected
          }
          statusLabel={
            anySensorConnected
              ? "LIVE"
              : "VÄNTAR"
          }
          recording={
            activityState === "recording"
          }
          onStartTraining={
            startTraining
          }
          onStopTraining={
            stopTraining
          }
        />
      }

      pro={
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
          label={
            anySensorConnected
              ? "LIVE"
              : "VÄNTAR"
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
          style={
            styles.sensorRow
          }
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
          style={
            styles.mainMetrics
          }
        >
          <MainMetric
            label="EFFEKT"
            value={
              powerWatts !==
              null
                ? String(
                    powerWatts
                  )
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
              cadenceRpm !==
              null
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
              heartRate !==
              null
                ? String(
                    heartRate
                  )
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
              Personlig FTP:{" "}
              {profile.ftpWatts !== null
                ? `${profile.ftpWatts} W`
                : "Ej angiven"}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.bottomArea
          }
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
        </View>
      </View>
    </SafeAreaView>
      }

      pass={
        <WorkoutPassPlaceholder
          connected={false}
          onBack={onBack}
          live={
            anySensorConnected
          }
          statusLabel={
            anySensorConnected
              ? "LIVE"
              : "VÄNTAR"
          }
          recording={
            activityState === "recording"
          }
          onStartTraining={
            startTraining
          }
          onStopTraining={
            stopTraining
          }
          sessions={activeSessions}
          sessionsLoading={
            activeSessionsLoading
          }
          sessionsError={
            activeSessionsError
          }
          onRefreshSessions={
            refreshActiveSessions
          }
          onSelectSession={
            (selectedSessionId) => {
              setAttachedSessionId(
                selectedSessionId
              );
            }
          }
        />
      }
    />
  );
}

function TrainingSummaryScreen({
  onBack,
  onContinue,
  elapsedSeconds,
  averageHeartRate,
  maxHeartRate,
  averagePower,
  maxPower,
  averageCadence,
  averageSpeed,
  distanceKm,
  proSession = false,
}: {
  onBack: () => void;
  onContinue: () => void;
  elapsedSeconds: number;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  averagePower: number | null;
  maxPower: number | null;
  averageCadence: number | null;
  averageSpeed: number | null;
  distanceKm: number | null;
  proSession?: boolean;
}) {
  const rounded = (
    value: number | null
  ) =>
    value !== null
      ? String(Math.round(value))
      : "--";

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View
        style={
          styles.summaryContent
        }
      >
        <TopBar
          onBack={onBack}
          live={false}
          label="KLAR"
        />

        <ProHeader
          title="Sammanfattning"
          subtitle="Din träning"
        />

        <View
          style={
            styles.summaryTimeCard
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
              styles.summaryTime
            }
          >
            {formatTrainingTime(
              elapsedSeconds
            )}
          </Text>
        </View>

        <View
          style={
            styles.summaryGrid
          }
        >
          <SummaryCard
            label="SNITTPULS"
            value={
              rounded(
                averageHeartRate
              )
            }
            unit="BPM"
          />

          <SummaryCard
            label="MAXPULS"
            value={
              rounded(
                maxHeartRate
              )
            }
            unit="BPM"
          />

          <SummaryCard
            label="SNITTEFFEKT"
            value={
              rounded(
                averagePower
              )
            }
            unit="W"
          />

          <SummaryCard
            label="MAXEFFEKT"
            value={
              rounded(
                maxPower
              )
            }
            unit="W"
          />

          <SummaryCard
            label="SNITTKADENS"
            value={
              rounded(
                averageCadence
              )
            }
            unit="RPM"
          />

          {averageSpeed !==
          null ? (
            <SummaryCard
              label="SNITTHASTIGHET"
              value={
                averageSpeed.toFixed(
                  1
                )
              }
              unit="KM/H"
            />
          ) : null}

          {distanceKm !==
          null ? (
            <SummaryCard
              label="DISTANS"
              value={
                distanceKm.toFixed(
                  2
                )
              }
              unit="KM"
            />
          ) : null}
        </View>

        <View
          style={
            styles.summaryBottom
          }
        >
          {proSession ? (
            <>
              <Pressable
                style={
                  styles.proStartButton
                }
                onPress={
                  onContinue
                }
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Tillbaka till passet
                </Text>
              </Pressable>

              <Text
                style={
                  styles.summaryHint
                }
              >
                Instruktörens pass
                fortsätter oberoende
                av din registrering.
              </Text>
            </>
          ) : (
            <Pressable
              style={
                styles.proStartButton
              }
              onPress={
                onContinue
              }
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Ny träning
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function SummaryCard({
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
        styles.summaryCard
      }
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
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {value}
      </Text>

      <Text
        style={
          styles.summaryUnit
        }
      >
        {unit}
      </Text>
    </View>
  );
}

function WaitingScreen({
  onBack,
  passName,
  equipmentName,
  pulseDeviceName,
  bikeConnected,
  pulseConnected,
  heartRate,
  powerWatts,
  cadenceRpm,
}: {
  onBack: () => void;
  passName: string;
  equipmentName:
    | string
    | null;
  pulseDeviceName:
    | string
    | null;
  bikeConnected: boolean;
  pulseConnected: boolean;
  heartRate:
    | number
    | null;
  powerWatts:
    | number
    | null;
  cadenceRpm:
    | number
    | null;
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
          live
          label="ANSLUTEN"
        />

        <ProHeader
          title="Spinning"
          subtitle={passName}
        />

        <View
          style={
            styles.sensorRow
          }
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
            styles.waitingCard
          }
        >
          <Text
            style={
              styles.blockEyebrow
            }
          >
            VÄNTAR PÅ
            INSTRUKTÖREN
          </Text>

          <Text
            style={
              styles.waitingTitle
            }
          >
            Redo
          </Text>

          <Text
            style={
              styles.waitingText
            }
          >
            Passet startar
            automatiskt när
            instruktören trycker
            start.
          </Text>
        </View>

        <View
          style={
            styles.proMetrics
          }
        >
          <MainMetric
            label="WATT"
            value={
              powerWatts !==
              null
                ? String(
                    powerWatts
                  )
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
            label="RPM"
            value={
              cadenceRpm !==
              null
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
              heartRate !==
              null
                ? String(
                    heartRate
                  )
                : "--"
            }
            unit="BPM"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function CountdownScreen({
  onBack,
  passName,
  seconds,
}: {
  onBack: () => void;
  passName: string;
  seconds: number;
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
          live
          label="STARTAR"
        />

        <ProHeader
          title="Spinning"
          subtitle={passName}
        />

        <View
          style={
            styles.countdownArea
          }
        >
          <Text
            style={
              styles.blockEyebrow
            }
          >
            PASS STARTAR OM
          </Text>

          <Text
            style={
              styles.countdownValue
            }
          >
            {seconds}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function StatusScreen({
  onBack,
  title,
  subtitle,
}: {
  onBack: () => void;
  title: string;
  subtitle?: string;
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
          live={false}
          label="VÄNTAR"
        />

        <View
          style={
            styles.statusCenter
          }
        >
          <Text
            style={
              styles.statusTitle
            }
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={
                styles.statusSubtitle
              }
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function ProSessionView({
  onBack,
  passName,
  sessionStatus,
  live,
  equipmentName,
  pulseDeviceName,
  bikeConnected,
  pulseConnected,
  blocks,
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
  passName: string;
  sessionStatus: string;
  live: boolean;
  equipmentName:
    | string
    | null;
  pulseDeviceName:
    | string
    | null;
  bikeConnected: boolean;
  pulseConnected: boolean;
  blocks:
    DisplayBlock[];
  currentBlock:
    | DisplayBlock
    | null;
  currentBlockIndex: number;
  blockRemaining: number;
  sessionElapsed: number;
  powerWatts:
    | number
    | null;
  cadenceRpm:
    | number
    | null;
  heartRate:
    | number
    | null;
  currentFtpPercent:
    | number
    | null;
  activityState:
    | "idle"
    | "recording"
    | "finished";
  elapsedSeconds: number;
  startTraining:
    () => void;
  stopTraining:
    () => void;
}) {
  const paused =
    sessionStatus ===
    "paused";

  const finished =
    sessionStatus ===
    "finished";

  /*
   * Position i hela passets grafiska tidslinje.
   * Bygger på instruktörens master-klocka.
   */
  const totalSessionSeconds =
    blocks.reduce(
      (sum, block) =>
        sum +
        block.durationSeconds,
      0
    );

  const timelineProgress =
    totalSessionSeconds > 0
      ? Math.min(
          1,
          Math.max(
            0,
            sessionElapsed /
              totalSessionSeconds
          )
        )
      : 0;

  const timelineProgressPercent =
    timelineProgress * 100;

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
          label={
            finished
              ? "AVSLUTAT"
              : paused
              ? "PAUS"
              : "LIVE"
          }
        />

        <ProHeader
          title="Spinning"
          subtitle={passName}
        />

        <View
          style={
            styles.sensorRow
          }
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

        {finished && (
          <View
            style={
              styles.finishedBanner
            }
          >
            <Text
              style={
                styles.finishedTitle
              }
            >
              Instruktörens pass är
              avslutat
            </Text>

            <Text
              style={
                styles.finishedText
              }
            >
              Din egen
              träningsregistrering
              stoppas inte
              automatiskt.
            </Text>
          </View>
        )}

        {paused && (
          <View
            style={
              styles.pauseBanner
            }
          >
            <Text
              style={
                styles.pauseText
              }
            >
              PASS PAUSAT
            </Text>
          </View>
        )}

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
            styles.profileWrapper
          }
        >
          <View
            style={
              styles.profileRow
            }
          >
            {blocks.map(
              (
                block,
                index
              ) => (
                <View
                  key={block.id}
                  style={[
                    styles.profileSegment,
                    {
                      flex:
                        Math.max(
                          1,
                          block.durationSeconds
                        ),
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

          {blocks.length > 0 ? (
            <View
              pointerEvents="none"
              style={[
                styles.profileMarker,
                {
                  left:
                    `${timelineProgressPercent}%` as `${number}%`,
                },
              ]}
            />
          ) : null}
        </View>

        <View
          style={[
            styles.blockCard,
            {
              borderTopColor:
                currentBlock
                  ?.color ??
                "#E31836",
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
            {currentBlock
              ?.title ??
              "Pass"}
          </Text>

          {!!currentBlock
            ?.instruction && (
            <Text
              style={
                styles.blockInstruction
              }
            >
              {
                currentBlock
                  .instruction
              }
            </Text>
          )}

          {currentBlock &&
          currentBlock.targets.length >
            0 ? (
            <View
              style={
                styles.targetsRow
              }
            >
              {currentBlock.targets.map(
                (
                  target,
                  index
                ) => (
                  <Target
                    key={`${target.label}-${index}`}
                    label={
                      target.label
                    }
                    value={
                      target.value
                    }
                  />
                )
              )}
            </View>
          ) : null}
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
              cadenceRpm !==
              null
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
              heartRate !==
              null
                ? String(
                    heartRate
                  )
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
              {powerWatts !==
              null
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
                : activityState ===
                  "finished"
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
  label,
}: {
  onBack: () => void;
  live: boolean;
  label: string;
}) {
  return (
    <View
      style={styles.topBar}
    >
      <Pressable
        onPress={onBack}
        hitSlop={12}
      >
        <Text
          style={styles.back}
        >
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
          style={
            styles.liveText
          }
        >
          {label}
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
      style={
        styles.sensorCard
      }
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
      style={
        styles.mainMetric
      }
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

function Target({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={styles.target}
    >
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
      backgroundColor:
        "#0b0b0d",
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
      backgroundColor:
        "#202023",
    },

    liveBadgeActive: {
      backgroundColor:
        "#10281a",
    },

    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        "#66666b",
    },

    liveDotActive: {
      backgroundColor:
        "#30d158",
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
      backgroundColor:
        "#18181b",
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
      backgroundColor:
        "#65656a",
    },

    sensorDotActive: {
      backgroundColor:
        "#30d158",
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

    profileWrapper: {
      position: "relative",
      marginTop: 13,
      height: 26,
      justifyContent: "center",
    },

    profileRow: {
      flexDirection: "row",
      height: 12,
      gap: 3,
    },

    profileSegment: {
      borderRadius: 4,
    },

    profileMarker: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: 3,
      borderRadius: 2,
      backgroundColor: "#ffffff",
      transform: [
        {
          translateX: -1.5,
        },
      ],
      zIndex: 10,
    },

    blockCard: {
      backgroundColor:
        "#18181b",
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
      backgroundColor:
        "#222225",
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
      backgroundColor:
        "#18181b",
      borderRadius: 20,
      marginTop: 11,
      paddingVertical: 14,
      paddingHorizontal: 5,
    },

    mainMetrics: {
      flexDirection: "row",
      backgroundColor:
        "#18181b",
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
      backgroundColor:
        "#303034",
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
      backgroundColor:
        "#141416",
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
      backgroundColor:
        "#E31836",
      borderRadius: 17,
      alignItems: "center",
      paddingVertical: 15,
    },

    proStopButton: {
      backgroundColor:
        "#ffffff",
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
      backgroundColor:
        "#151517",
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
      position: "absolute",
      left: 20,
      right: 20,
      bottom: 26,
      zIndex: 20,
    },

    primaryButton: {
      backgroundColor:
        "#E31836",
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 54,
    },

    primaryButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "800",
    },

    stopButton: {
      backgroundColor:
        "#2a2a2e",
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 54,
    },

    stopButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "800",
    },

    waitingCard: {
      backgroundColor:
        "#18181b",
      borderRadius: 22,
      padding: 24,
      marginTop: 30,
      alignItems: "center",
    },

    waitingTitle: {
      color: "#ffffff",
      fontSize: 42,
      fontWeight: "800",
      marginTop: 8,
    },

    waitingText: {
      color: "#8d8d93",
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
      marginTop: 10,
    },

    countdownArea: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
    },

    countdownValue: {
      color: "#ffffff",
      fontSize: 130,
      lineHeight: 145,
      fontWeight: "800",
      fontVariant: [
        "tabular-nums",
      ],
    },

    pauseBanner: {
      marginTop: 10,
      backgroundColor:
        "#3a2e16",
      borderRadius: 12,
      alignItems: "center",
      paddingVertical: 8,
    },

    pauseText: {
      color: "#ffffff",
      fontWeight: "800",
      letterSpacing: 1.5,
      fontSize: 12,
    },

    finishedBanner: {
      marginTop: 10,
      backgroundColor:
        "#2b2022",
      borderRadius: 14,
      padding: 12,
    },

    finishedTitle: {
      color: "#ffffff",
      fontWeight: "800",
      fontSize: 14,
    },

    finishedText: {
      color: "#aaaab0",
      fontSize: 11,
      marginTop: 3,
    },

    summaryContent: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 18,
    },

    summaryTimeCard: {
      backgroundColor:
        "#18181b",
      borderRadius: 22,
      paddingVertical: 22,
      paddingHorizontal: 18,
      marginTop: 20,
      alignItems: "center",
    },

    summaryTime: {
      color: "#ffffff",
      fontSize: 48,
      lineHeight: 54,
      fontWeight: "800",
      marginTop: 4,
      fontVariant: [
        "tabular-nums",
      ],
    },

    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 12,
    },

    summaryCard: {
      width: "48.5%",
      backgroundColor:
        "#18181b",
      borderRadius: 18,
      paddingVertical: 16,
      paddingHorizontal: 14,
      minHeight: 112,
      justifyContent:
        "center",
    },

    summaryLabel: {
      color: "#7d7d83",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.1,
    },

    summaryValue: {
      color: "#ffffff",
      fontSize: 32,
      lineHeight: 37,
      fontWeight: "800",
      marginTop: 3,
    },

    summaryUnit: {
      color: "#89898f",
      fontSize: 10,
      fontWeight: "700",
      marginTop: 1,
    },

    summaryBottom: {
      marginTop: "auto",
      paddingTop: 14,
    },

    summaryHint: {
      color: "#737379",
      fontSize: 12,
      lineHeight: 17,
      textAlign: "center",
      marginTop: 10,
    },

    statusCenter: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 20,
    },

    statusTitle: {
      color: "#ffffff",
      fontSize: 25,
      fontWeight: "800",
      textAlign: "center",
    },

    statusSubtitle: {
      color: "#8e8e94",
      fontSize: 14,
      textAlign: "center",
      marginTop: 10,
    },
  });
