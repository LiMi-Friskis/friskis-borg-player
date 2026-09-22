import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useMemo,
  useState,
} from "react";

type Props = {
  elapsedSeconds: number;
  caloriesKcal: number;
  powerWatts: number | null;
  ftpPercent: number | null;
  wattsPerKg: number | null;
  cadenceRpm: number | null;
  heartRate: number | null;
  maxHeartRatePercent: number | null;
  speedKmh: number | null;
  distanceKm: number | null;
  onBack: () => void;
  live: boolean;
  statusLabel: string;
  recording: boolean;
  onStartTraining: () => void;
  onStopTraining: () => void;
};

type MetricId =
  | "time"
  | "power"
  | "ftp"
  | "wkg"
  | "cadence"
  | "heartRate"
  | "maxHeartRate"
  | "speed"
  | "distance"
  | "calories";

type Metric = {
  id: MetricId;
  label: string;
  value: string;
  unit: string;
};

function formatTime(
  seconds: number
) {
  const safe = Math.max(
    0,
    Math.floor(seconds)
  );

  const hours =
    Math.floor(safe / 3600);

  const minutes =
    Math.floor(
      (safe % 3600) / 60
    );

  const secs = safe % 60;

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
  metric,
  selected,
  onPress,
}: {
  metric: Metric;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected &&
          styles.cardSelected,
        pressed &&
          styles.cardPressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          selected &&
            styles.labelSelected,
        ]}
        numberOfLines={1}
      >
        {metric.label}
      </Text>

      <View style={styles.cardValueRow}>
        <Text
          style={styles.value}
          numberOfLines={1}
        >
          {metric.value}
        </Text>

        {metric.unit !== "" && (
          <Text
            style={styles.unitInline}
            numberOfLines={1}
          >
            {metric.unit}
          </Text>
        )}
      </View>
    </Pressable>
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
        style={
          styles.trainingButtonText
        }
      >
        {recording
          ? "■  Stoppa träning"
          : "●  Starta träning"}
      </Text>
    </Pressable>
  );
}

export default function WorkoutDataView({
  elapsedSeconds,
  caloriesKcal,
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
  const [
    selectedMetricId,
    setSelectedMetricId,
  ] = useState<MetricId>("time");

  const metrics =
    useMemo<Metric[]>(
      () => [
        {
          id: "power",
          label: "EFFEKT",
          value:
            powerWatts !== null
              ? String(
                  Math.round(
                    powerWatts
                  )
                )
              : "--",
          unit: "W",
        },
        {
          id: "ftp",
          label: "% FTP",
          value:
            ftpPercent !== null
              ? String(
                  Math.round(
                    ftpPercent
                  )
                )
              : "--",
          unit: "%",
        },
        {
          id: "wkg",
          label: "W / KG",
          value:
            wattsPerKg !== null
              ? wattsPerKg.toFixed(2)
              : "--",
          unit: "W/kg",
        },
        {
          id: "cadence",
          label: "KADENS",
          value:
            cadenceRpm !== null
              ? String(
                  Math.round(
                    cadenceRpm
                  )
                )
              : "--",
          unit: "RPM",
        },
        {
          id: "heartRate",
          label: "PULS",
          value:
            heartRate !== null
              ? String(
                  Math.round(
                    heartRate
                  )
                )
              : "--",
          unit: "BPM",
        },
        {
          id: "maxHeartRate",
          label: "% MAXPULS",
          value:
            maxHeartRatePercent !==
            null
              ? String(
                  Math.round(
                    maxHeartRatePercent
                  )
                )
              : "--",
          unit: "%",
        },
        {
          id: "speed",
          label: "HASTIGHET",
          value:
            speedKmh !== null
              ? speedKmh.toFixed(1)
              : "--",
          unit: "km/h",
        },
        {
          id: "distance",
          label: "DISTANS",
          value:
            distanceKm !== null
              ? distanceKm.toFixed(2)
              : "--",
          unit: "km",
        },
        {
          id: "time",
          label: "TRÄNINGSTID",
          value:
            formatTime(
              elapsedSeconds
            ),
          unit: "",
        },
        {
          id: "calories",
          label: "KCAL",
          value: String(
            Math.round(
              caloriesKcal
            )
          ),
          unit: "kcal",
        },
      ],
      [
        elapsedSeconds,
        caloriesKcal,
        powerWatts,
        ftpPercent,
        wattsPerKg,
        cadenceRpm,
        heartRate,
        maxHeartRatePercent,
        speedKmh,
        distanceKm,
      ]
    );

  const selectedMetric =
    metrics.find(
      (metric) =>
        metric.id ===
        selectedMetricId
    ) ?? metrics[8];

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

        <View
          style={styles.heroArea}
        >
          <Text
            style={styles.heroLabel}
          >
            {selectedMetric.label}
          </Text>

          <View
            style={styles.heroValueRow}
          >
            <Text
              style={styles.heroValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {selectedMetric.value}
            </Text>

            {selectedMetric.unit !==
              "" && (
              <Text
                style={styles.heroUnit}
              >
                {selectedMetric.unit}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.grid}>
          {metrics.map((metric) => (
            <DataCard
              key={metric.id}
              metric={metric}
              selected={
                metric.id ===
                selectedMetricId
              }
              onPress={() =>
                setSelectedMetricId(
                  metric.id
                )
              }
            />
          ))}
        </View>

        <TrainingControl
          recording={recording}
          onStart={
            onStartTraining
          }
          onStop={
            onStopTraining
          }
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
      minHeight: 42,
      marginBottom: 2,
    },

    back: {
      color: "#d2d2d7",
      fontSize: 18,
      fontWeight: "700",
    },

    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 12,
      paddingVertical: 7,
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

    heroArea: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 96,
      marginBottom: 8,
    },

    heroLabel: {
      color: "#77777d",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.4,
    },

    heroValueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "center",
      marginTop: 1,
    },

    heroValue: {
      color: "#ffffff",
      fontSize: 62,
      lineHeight: 68,
      fontWeight: "800",
      fontVariant: [
        "tabular-nums",
      ],
    },

    heroUnit: {
      color: "#8e8e94",
      fontSize: 16,
      fontWeight: "700",
      marginLeft: 6,
    },

    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent:
        "space-between",
      rowGap: 6,
    },

    card: {
      width: "49%",
      height: 61,
      backgroundColor: "#18181b",
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: "transparent",
    },

    cardSelected: {
      borderColor: "#5a5a60",
      backgroundColor: "#202024",
    },

    cardPressed: {
      opacity: 0.72,
    },

    label: {
      color: "#7d7d83",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.9,
    },

    labelSelected: {
      color: "#b7b7bc",
    },

    cardValueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "center",
      marginTop: 1,
    },

    value: {
      color: "#ffffff",
      fontSize: 26,
      lineHeight: 30,
      fontWeight: "800",
      fontVariant: [
        "tabular-nums",
      ],
    },

    unitInline: {
      color: "#89898f",
      fontSize: 9,
      fontWeight: "700",
      marginLeft: 4,
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
