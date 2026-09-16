import {
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  title: string;
  subtitle?: string;
};

export default function ProHeader({
  title,
  subtitle,
}: Props) {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/training-player-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.textArea}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {title}
          </Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              PRO
            </Text>
          </View>
        </View>

        {subtitle ? (
          <Text style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  logo: {
    width: 58,
    height: 58,
  },

  textArea: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  title: {
    color: "#ffffff",
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
  },

  badge: {
    backgroundColor: "#E31836",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  badgeText: {
    color: "#ffffff",
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    letterSpacing: 0.8,
  },

  subtitle: {
    color: "#8f8f94",
    marginTop: 3,
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
  },
});