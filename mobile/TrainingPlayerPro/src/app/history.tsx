import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ProHeader from "@/components/pro/ProHeader";

export default function HistoryScreen() {
  return (
    <SafeAreaView
      style={styles.container}
    >
      <View
        style={styles.content}
      >
        <ProHeader
          title="Historik"
          subtitle="Dina träningspass"
        />

        <View
          style={styles.emptyCard}
        >
          <Text
            style={styles.icon}
          >
            ◷
          </Text>

          <Text
            style={styles.title}
          >
            Ingen historik ännu
          </Text>

          <Text
            style={styles.text}
          >
            Avslutade träningspass
            kommer senare att sparas
            lokalt här.
          </Text>

          <Text
            style={
              styles.secondary
            }
          >
            Härifrån kommer du också
            kunna öppna ett tidigare
            pass och exportera det
            till Strava.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#09090b",
    },

    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
    },

    emptyCard: {
      backgroundColor:
        "#18181b",
      borderRadius: 22,
      paddingHorizontal: 24,
      paddingVertical: 34,
      marginTop: 28,
      alignItems: "center",
    },

    icon: {
      color: "#ffffff",
      fontSize: 36,
      marginBottom: 14,
    },

    title: {
      color: "#ffffff",
      fontSize: 20,
      fontWeight: "800",
      textAlign: "center",
    },

    text: {
      color: "#8e8e94",
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      marginTop: 8,
    },

    secondary: {
      color: "#626268",
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 16,
    },
  });
