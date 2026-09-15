import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ProHeader from "./ProHeader";

type Props = {
  elapsedSeconds: number;

  powerWatts:
    | number
    | null;

  ftpPercent:
    | number
    | null;

  wattsPerKg:
    | number
    | null;

  cadenceRpm:
    | number
    | null;

  heartRate:
    | number
    | null;

  maxHeartRatePercent:
    | number
    | null;

  speedKmh:
    | number
    | null;

  distanceKm:
    | number
    | null;

  onBack: () => void;

  live: boolean;

  statusLabel: string;

  recording: boolean;

  onStartTraining: () => void;

  onStopTraining: () => void;
};

function formatTime(
  seconds: number
) {
  const safe =
    Math.max(
      0,
      Math.floor(seconds)
    );

  const hours =
    Math.floor(safe / 3600);

  const minutes =
    Math.floor(
      (safe % 3600) / 60
    );

  const secs =
    safe % 60;

  if (hours > 0) {
    return [
      hours,
      minutes,
      secs,
    ]
      .map((value) =>
        String(value).padStart(
          2,
          "0"
        )
      )
      .join(":");
  }

  return [
    minutes,
    secs,
  ]
    .map((value) =>
      String(value).padStart(
        2,
        "0"
      )
    )
    .join(":");
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

        <Text style={styles.liveText}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function DataCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Text style={styles.value}>
        {value}
      </Text>

      <Text style={styles.unit}>
        {unit}
      </Text>
    </View>
  );
}

function TrainingControl({
  recording,
  onStart,
  onStop,
}: {
  recording: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.trainingButton,
        recording &&
          styles.trainingButtonStop,
      ]}
      onPress={
        recording
          ? onStop
          : onStart
      }
    >
      <Text
        style={styles.trainingButtonText}
      >
        {recording
          ? "Stoppa träning"
          : "Starta träning"}
      </Text>
    </Pressable>
  );
}

export default function WorkoutDataView({
  elapsedSeconds,
  powerWatts,
  ftpPercent,
  wattsPerKg,
  cadenceRpm,
  heartRate,
  maxHeartRatePercent,
  speedKmh,
  distanceKm,
  onBack,
  live,
  statusLabel,
  recording,
  onStartTraining,
  onStopTraining,
}: Props) {
  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.content}>
        <TopBar
          onBack={onBack}
          live={live}
          label={statusLabel}
        />

        <ProHeader
          title="Spinning"
          subtitle="Data"
        />

        <View style={styles.timeArea}>
          <Text style={styles.timeLabel}>
            TRÄNINGSTID
          </Text>

          <Text style={styles.time}>
            {formatTime(
              elapsedSeconds
            )}
          </Text>
        </View>

        <View style={styles.grid}>
          <DataCard
            label="EFFEKT"
            value={
              powerWatts !== null
                ? String(
                    Math.round(
                      powerWatts
                    )
                  )
                : "--"
            }
            unit="W"
          />

          <DataCard
            label="% FTP"
            value={
              ftpPercent !== null
                ? String(
                    Math.round(
                      ftpPercent
                    )
                  )
                : "--"
            }
            unit="%"
          />

          <DataCard
            label="W / KG"
            value={
              wattsPerKg !== null
                ? wattsPerKg.toFixed(
                    2
                  )
                : "--"
            }
            unit="W/kg"
          />

          <DataCard
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

          <DataCard
            label="PULS"
            value={
              heartRate !== null
                ? String(
                    Math.round(
                      heartRate
                    )
                  )
                : "--"
            }
            unit="BPM"
          />

          <DataCard
            label="% MAXPULS"
            value={
              maxHeartRatePercent !==
              null
                ? String(
                    Math.round(
                      maxHeartRatePercent
                    )
                  )
                : "--"
            }
            unit="%"
          />

          <DataCard
            label="HASTIGHET"
            value={
              speedKmh !== null
                ? speedKmh.toFixed(1)
                : "--"
            }
            unit="km/h"
          />

          <DataCard
            label="DISTANS"
            value={
              distanceKm !== null
                ? distanceKm.toFixed(2)
                : "--"
            }
            unit="km"
          />
        </View>

        <TrainingControl
          recording={recording}
          onStart={onStartTraining}
          onStop={onStopTraining}
        />
      </View>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#0b0b0d",
    },

    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 94,
    },

    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      minHeight: 48,
      marginBottom: 8,
    },

    back: {
      color: "#d2d2d7",
      fontSize: 20,
      fontWeight: "700",
    },

    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: "#1a1a1d",
    },

    liveBadgeActive: {
      backgroundColor: "#10281a",
    },

    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#6e6e73",
    },

    liveDotActive: {
      backgroundColor: "#30d158",
    },

    liveText: {
      color: "#ffffff",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.5,
    },

    timeArea: {
      alignItems: "center",
      marginTop: 16,
      marginBottom: 14,
    },

    timeLabel: {
      color: "#77777d",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.4,
    },

    time: {
      color: "#ffffff",
      fontSize: 44,
      lineHeight: 50,
      fontWeight: "800",
      marginTop: 2,
      fontVariant: [
        "tabular-nums",
      ],
    },

    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    card: {
      width: "48.8%",
      minHeight: 94,
      backgroundColor: "#18181b",
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      padding: 8,
    },

    label: {
      color: "#7d7d83",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.05,
    },

    value: {
      color: "#ffffff",
      fontSize: 31,
      lineHeight: 35,
      fontWeight: "800",
      marginTop: 2,
    },

    unit: {
      color: "#89898f",
      fontSize: 10,
      fontWeight: "700",
      marginTop: 1,
    },

    trainingButton: {
      position: "absolute",
      left: 20,
      right: 20,
      bottom: 26,
      minHeight: 54,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#E31836",
      zIndex: 20,
    },

    trainingButtonStop: {
      backgroundColor: "#2a2a2e",
    },

    trainingButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "800",
    },
  });
