import {
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
};

export default function MetricCard({
  label,
  value,
  unit,
  hint,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>
        {label}
      </Text>

      <View style={styles.valueRow}>
        <Text style={styles.value}>
          {value}
        </Text>

        {unit ? (
          <Text style={styles.unit}>
            {unit}
          </Text>
        ) : null}
      </View>

      {hint ? (
        <Text style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 112,
    backgroundColor: "#1b1b1e",
    borderRadius: 18,
    padding: 16,
    justifyContent: "center",
  },

  label: {
    color: "#8f8f94",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 5,
  },

  value: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "800",
  },

  unit: {
    color: "#b8b8bd",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 5,
  },

  hint: {
    color: "#68686d",
    fontSize: 11,
    marginTop: 4,
  },
});