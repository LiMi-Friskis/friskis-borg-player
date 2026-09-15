import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  recording: boolean;
  onStart: () => void;
  onStop: () => void;
};

export default function WorkoutTrainingControl({
  recording,
  onStart,
  onStop,
}: Props) {
  return (
    <View style={styles.dock}>
      <Pressable
        style={[
          styles.button,
          recording
            ? styles.stopButton
            : styles.startButton,
        ]}
        onPress={
          recording
            ? onStop
            : onStart
        }
      >
        <Text style={styles.text}>
          {recording
            ? "Stoppa träning"
            : "Starta träning"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles =
  StyleSheet.create({
    dock: {
      position: "absolute",
      left: 20,
      right: 20,
      bottom: 26,
      zIndex: 20,
    },

    button: {
      height: 54,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },

    startButton: {
      backgroundColor: "#E31836",
    },

    stopButton: {
      backgroundColor: "#2a2a2e",
    },

    text: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "800",
    },
  });
