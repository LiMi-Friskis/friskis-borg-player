import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ProHeader from "./ProHeader";

type Props = {
  passName?: string | null;
  connected: boolean;
  onBack: () => void;
  live: boolean;
  statusLabel: string;

  recording: boolean;

  onStartTraining: () => void;

  onStopTraining: () => void;
};

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

export default function WorkoutPassPlaceholder({
  passName,
  connected,
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
          subtitle={
            connected
              ? passName ??
                "Anslutet pass"
              : "Pass"
          }
        />

        <View style={styles.center}>
          <Text style={styles.eyebrow}>
            PASS
          </Text>

          <Text style={styles.title}>
            {connected
              ? "Passvyn kommer här"
              : "INGET PASS ANSLUTET"}
          </Text>

          <Text style={styles.text}>
            {connected
              ? "Nästa steg visar aktuellt mål, blocktid, nästa block och hela passprofilen här."
              : "Du tränar fristående. Senare kan du ansluta till ett pågående Pro-pass utan att stoppa din registrering."}
          </Text>
        </View>

        <Pressable
          style={[
            styles.trainingButton,
            recording &&
              styles.trainingButtonStop,
          ]}
          onPress={
            recording
              ? onStopTraining
              : onStartTraining
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

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },

    eyebrow: {
      color: "#E31836",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.8,
    },

    title: {
      color: "#ffffff",
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "800",
      textAlign: "center",
      marginTop: 10,
    },

    text: {
      color: "#8e8e94",
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      marginTop: 14,
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
