import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useEffect,
  useState,
} from "react";

import {
  useUserProfile,
} from "@/context/UserProfileContext";
import ProHeader from "@/components/pro/ProHeader";

function numberToText(
  value: number | null
) {
  return value === null
    ? ""
    : String(value);
}

function parseNumber(
  value: string
) {
  const normalized =
    value
      .trim()
      .replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed =
    Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export default function SettingsScreen() {
  const {
    profile,
    loaded,
    updateProfile,
  } = useUserProfile();

  const [weight, setWeight] =
    useState("");

  const [ftp, setFtp] =
    useState("");

  const [
    maxHeartRate,
    setMaxHeartRate,
  ] = useState("");

  useEffect(() => {
    if (!loaded) {
      return;
    }

    setWeight(
      numberToText(
        profile.weightKg
      )
    );

    setFtp(
      numberToText(
        profile.ftpWatts
      )
    );

    setMaxHeartRate(
      numberToText(
        profile.maxHeartRate
      )
    );
  }, [loaded]);

  const saveWeight = () => {
    updateProfile({
      weightKg:
        parseNumber(weight),
    });
  };

  const saveFtp = () => {
    updateProfile({
      ftpWatts:
        parseNumber(ftp),
    });
  };

  const saveMaxHeartRate =
    () => {
      updateProfile({
        maxHeartRate:
          parseNumber(
            maxHeartRate
          ),
      });
    };

  return (
    <SafeAreaView
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
        >
          <ProHeader
            title="Inställningar"
            subtitle="Personliga träningsvärden"
          />

          <Text
            style={styles.intro}
          >
            Dina värden sparas lokalt
            på telefonen och används
            för att beräkna personlig
            träningsdata.
          </Text>

          <View
            style={styles.section}
          >
            <ProfileField
              label="VIKT"
              value={weight}
              onChangeText={
                setWeight
              }
              onSave={saveWeight}
              unit="kg"
              description="Används för att beräkna W/kg."
              placeholder="82"
              decimal
            />

            <ProfileField
              label="FTP"
              value={ftp}
              onChangeText={
                setFtp
              }
              onSave={saveFtp}
              unit="W"
              description="Används för att beräkna aktuell % av FTP."
              placeholder="200"
            />

            <ProfileField
              label="MAXPULS"
              value={
                maxHeartRate
              }
              onChangeText={
                setMaxHeartRate
              }
              onSave={
                saveMaxHeartRate
              }
              unit="bpm"
              description="Används för att beräkna % av maxpuls."
              placeholder="175"
            />
          </View>

          <View
            style={styles.infoCard}
          >
            <Text
              style={
                styles.infoTitle
              }
            >
              PERSONLIG DATA
            </Text>

            <Text
              style={
                styles.infoText
              }
            >
              Uppgifterna lämnar inte
              telefonen i den här
              prototypversionen.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProfileField({
  label,
  value,
  onChangeText,
  onSave,
  unit,
  description,
  placeholder,
  decimal = false,
}: {
  label: string;
  value: string;
  onChangeText: (
    value: string
  ) => void;
  onSave: () => void;
  unit: string;
  description: string;
  placeholder: string;
  decimal?: boolean;
}) {
  return (
    <View
      style={styles.fieldCard}
    >
      <Text
        style={styles.label}
      >
        {label}
      </Text>

      <View
        style={styles.inputRow}
      >
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={
            onChangeText
          }
          onBlur={onSave}
          onSubmitEditing={
            onSave
          }
          placeholder={
            placeholder
          }
          placeholderTextColor="#55555c"
          keyboardType={
            decimal
              ? "decimal-pad"
              : "number-pad"
          }
          returnKeyType="done"
        />

        <Text
          style={styles.unit}
        >
          {unit}
        </Text>
      </View>

      <Text
        style={
          styles.description
        }
      >
        {description}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#09090b",
    },

    flex: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 120,
    },

    intro: {
      color: "#8e8e94",
      fontSize: 14,
      lineHeight: 20,
      marginTop: 18,
      marginBottom: 18,
    },

    section: {
      gap: 12,
    },

    fieldCard: {
      backgroundColor:
        "#18181b",
      borderRadius: 20,
      padding: 18,
    },

    label: {
      color: "#8e8e94",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
      marginBottom: 8,
    },

    inputRow: {
      flexDirection: "row",
      alignItems: "baseline",
    },

    input: {
      flex: 1,
      color: "#ffffff",
      fontSize: 36,
      fontWeight: "800",
      paddingVertical: 2,
      paddingHorizontal: 0,
    },

    unit: {
      color: "#8e8e94",
      fontSize: 15,
      fontWeight: "700",
      marginLeft: 10,
    },

    description: {
      color: "#6f6f75",
      fontSize: 12,
      lineHeight: 17,
      marginTop: 6,
    },

    infoCard: {
      borderWidth: 1,
      borderColor: "#242429",
      borderRadius: 18,
      padding: 16,
      marginTop: 18,
    },

    infoTitle: {
      color: "#8e8e94",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.1,
    },

    infoText: {
      color: "#737379",
      fontSize: 12,
      lineHeight: 18,
      marginTop: 6,
    },
  });
