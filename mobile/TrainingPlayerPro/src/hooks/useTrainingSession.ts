import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ActivityState =
  | "idle"
  | "recording"
  | "finished";

export type LiveMetrics = {
  heartRate: number | null;
  speedKmh: number | null;
  distanceKm: number | null;
  powerWatts: number | null;
  cadenceRpm: number | null;
};

export type TrainingSample = {
  timestamp: number;
  heartRate: number | null;
  speedKmh: number | null;
  distanceKm: number | null;
  powerWatts: number | null;
  cadenceRpm: number | null;
};

export function useTrainingSession(
  metrics: LiveMetrics
) {
  const [activityState, setActivityState] =
    useState<ActivityState>("idle");

  const [elapsedSeconds, setElapsedSeconds] =
    useState(0);

  const [samples, setSamples] =
    useState<TrainingSample[]>([]);

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const latestMetrics =
    useRef(metrics);

  useEffect(() => {
    latestMetrics.current =
      metrics;
  }, [metrics]);

  useEffect(() => {
    if (
      activityState !==
      "recording"
    ) {
      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );

        timerRef.current = null;
      }

      return;
    }

    timerRef.current =
      setInterval(() => {
        setElapsedSeconds(
          (current) =>
            current + 1
        );

        const current =
          latestMetrics.current;

        setSamples(
          (existing) => [
            ...existing,
            {
              timestamp: Date.now(),
              heartRate:
                current.heartRate,
              speedKmh:
                current.speedKmh,
              distanceKm:
                current.distanceKm,
              powerWatts:
                current.powerWatts,
              cadenceRpm:
                current.cadenceRpm,
            },
          ]
        );
      }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );

        timerRef.current = null;
      }
    };
  }, [activityState]);

  const startTraining = () => {
    setSamples([]);
    setElapsedSeconds(0);
    setActivityState(
      "recording"
    );
  };

  const stopTraining = () => {
    setActivityState(
      "finished"
    );
  };

  const resetTraining = () => {
    setSamples([]);
    setElapsedSeconds(0);
    setActivityState(
      "idle"
    );
  };

  const summary =
    useMemo(() => {
      const heartRates =
        samples
          .map(
            (sample) =>
              sample.heartRate
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          );

      const speeds =
        samples
          .map(
            (sample) =>
              sample.speedKmh
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          );

      const powers =
        samples
          .map(
            (sample) =>
              sample.powerWatts
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          );

      const cadences =
        samples
          .map(
            (sample) =>
              sample.cadenceRpm
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          );

      const average = (
        values: number[]
      ) => {
        if (
          values.length === 0
        ) {
          return null;
        }

        return (
          values.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / values.length
        );
      };

      const distances =
        samples
          .map(
            (sample) =>
              sample.distanceKm
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          );

      return {
        averageHeartRate:
          average(heartRates),

        maxHeartRate:
          heartRates.length
            ? Math.max(
                ...heartRates
              )
            : null,

        averageSpeed:
          average(speeds),

        averagePower:
          average(powers),

        maxPower:
          powers.length
            ? Math.max(
                ...powers
              )
            : null,

        averageCadence:
          average(cadences),

        distanceKm:
          distances.length
            ? distances[
                distances.length -
                  1
              ]
            : null,
      };
    }, [samples]);

  return {
    activityState,
    elapsedSeconds,
    samples,
    summary,
    startTraining,
    stopTraining,
    resetTraining,
  };
}

export function formatTrainingTime(
  totalSeconds: number
) {
  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) /
      60
  );

  const seconds =
    totalSeconds % 60;

  if (hours > 0) {
    return `${String(
      hours
    ).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }

  return `${String(
    minutes
  ).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
}