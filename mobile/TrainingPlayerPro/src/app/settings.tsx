import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
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

  const [
    showOtherBluetoothDevices,
    setShowOtherBluetoothDevices,
  ] = useState(false);

  const [
    showIndoorWalking,
    setShowIndoorWalking,
  ] = useState(false);

  const [
    saved,
    setSaved,
  ] = useState(false);

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

    setShowOtherBluetoothDevices(
      profile.showOtherBluetoothDevices
    );

    setShowIndoorWalking(
      profile.showIndoorWalking
    );
  }, [loaded]);

  const handleChange = (
    setter: (
      value: string
    ) => void
  ) => (
    value: string
  ) => {
    setter(value);
    setSaved(false);
  };

  const saveSettings = () => {
    updateProfile({
      weightKg:
        parseNumber(weight),

      ftpWatts:
        parseNumber(ftp),

      maxHeartRate:
        parseNumber(
          maxHeartRate
        ),

      showOtherBluetoothDevices,

      showIndoorWalking,
    });

    setSaved(true);
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
          />

          <Text
            style={styles.intro}
          >
            Dina värden sparas lokalt
            på telefonen.
          </Text>

          <View
            style={styles.section}
          >
            <ProfileField
              label="VIKT"
              value={weight}
              onChangeText={
                handleChange(
                  setWeight
                )
              }
              unit="kg"
              placeholder="82"
              decimal
            />

            <ProfileField
              label="FTP"
              value={ftp}
              onChangeText={
                handleChange(
                  setFtp
                )
              }
              unit="W"
              placeholder="200"
            />

            <ProfileField
              label="MAXPULS"
              value={
                maxHeartRate
              }
              onChangeText={
                handleChange(
                  setMaxHeartRate
                )
              }
              unit="bpm"
              placeholder="175"
            />
          </View>

          <Pressable
            style={
              styles.saveButton
            }
            onPress={
              saveSettings
            }
          >
            <Text
              style={
                styles.saveButtonText
              }
            >
              Spara inställningar
            </Text>
          </Pressable>

          {saved ? (
            <Text
              style={
                styles.savedText
              }
            >
              ✓ Inställningarna är sparade
            </Text>
          ) : null}

          <View
            style={styles.betaSection}
          >
            <Text
              style={styles.betaTitle}
            >
              BETA
            </Text>

            <SettingSwitch
              title="Visa övriga BT-enheter"
              value={
                showOtherBluetoothDevices
              }
              onValueChange={(value) => {
                setShowOtherBluetoothDevices(
                  value
                );
                setSaved(false);
              }}
            />

            <SettingSwitch
              title="Visa Indoor Walking"
              value={
                showIndoorWalking
              }
              onValueChange={(value) => {
                setShowIndoorWalking(
                  value
                );
                setSaved(false);
              }}
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
              Dina personliga data sparas
              lokalt på telefonen och delas
              aldrig.
            </Text>
          </View>

          <Text style={styles.developerText}>
            Utvecklad av LiMi Equus AB
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProfileField({
  label,
  value,
  onChangeText,
  unit,
  placeholder,
  decimal = false,
}: {
  label: string;
  value: string;
  onChangeText: (
    value: string
  ) => void;
  unit: string;
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
          placeholder={
            placeholder
          }
          placeholderTextColor="#55555c"
          keyboardType={
            decimal
              ? "decimal-pad"
              : "number-pad"
          }
        />

        <Text
          style={styles.unit}
        >
          {unit}
        </Text>
      </View>
    </View>
  );
}

function SettingSwitch({
  title,
  value,
  onValueChange,
}: {
  title: string;
  value: boolean;
  onValueChange: (
    value: boolean
  ) => void;
}) {
  return (
    <View
      style={styles.switchRow}
    >
      <Text
        style={styles.switchTitle}
      >
        {title}
      </Text>

      <Switch
        value={value}
        onValueChange={
          onValueChange
        }
      />
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
      paddingTop: 12,
      paddingBottom: 100,
    },

    intro: {
      color: "#8e8e94",
      fontSize: 13,
      lineHeight: 18,
      marginTop: 10,
      marginBottom: 12,
    },

    section: {
      gap: 8,
    },

    fieldCard: {
      backgroundColor:
        "#18181b",
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },

    label: {
      color: "#8e8e94",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.2,
      marginBottom: 2,
    },

    inputRow: {
      flexDirection: "row",
      alignItems: "baseline",
    },

    input: {
      flex: 1,
      color: "#ffffff",
      fontSize: 30,
      fontWeight: "800",
      paddingVertical: 0,
      paddingHorizontal: 0,
    },

    unit: {
      color: "#8e8e94",
      fontSize: 14,
      fontWeight: "700",
      marginLeft: 10,
    },

    saveButton: {
      minHeight: 50,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "#E31836",
      marginTop: 12,
    },

    saveButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "800",
    },

    savedText: {
      color: "#30D158",
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center",
      marginTop: 8,
    },

    betaSection: {
      marginTop: 18,
    },

    betaTitle: {
      color: "#8e8e94",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.2,
      marginBottom: 6,
    },

    switchRow: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      borderBottomWidth: 1,
      borderBottomColor:
        "#242429",
    },

    switchTitle: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "600",
      flex: 1,
      paddingRight: 12,
    },

    infoCard: {
      borderWidth: 1,
      borderColor: "#242429",
      borderRadius: 16,
      padding: 14,
      marginTop: 16,
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
      lineHeight: 17,
      marginTop: 4,
    },
    developerText: {
      color: "#737379",
      fontSize: 12,
      textAlign: "center",
      marginTop: 18,
      marginBottom: 16,
    },
});
