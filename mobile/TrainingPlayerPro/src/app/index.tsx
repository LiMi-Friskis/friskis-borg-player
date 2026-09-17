import {
  useEffect,
  useState,
} from "react";

import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import DeviceManager, {
  TrainingMode,
  TrainingSetup,
} from "../components/DeviceManager";

import SpinningView from "../components/SpinningView";
import IndoorWalkingView from "../components/IndoorWalkingView";
import ActiveSessionsView from "../components/ActiveSessionsView";

import {
  LiveSession,
} from "../types/liveSession";

import {
  useTabBar,
} from "../context/TabBarContext";

type Screen =
  | "home"
  | "devices"
  | "sessions"
  | "session-devices"
  | "spinning"
  | "indoor-walking";

function activityToMode(
  activity: unknown
): TrainingMode | null {
  if (!activity) {
    return null;
  }

  if (
    typeof activity ===
    "object"
  ) {
    const objectActivity =
      activity as {
        name?: unknown;
        label?: unknown;
        id?: unknown;
        slug?: unknown;
        value?: unknown;
      };

    return activityToMode(
      objectActivity.name ??
        objectActivity.label ??
        objectActivity.slug ??
        objectActivity.value ??
        objectActivity.id
    );
  }

  const value =
    String(activity)
      .trim()
      .toLowerCase();

  if (
    value.includes(
      "spinning"
    ) ||
    value.includes(
      "cycling"
    ) ||
    value.includes("cykel")
  ) {
    return "spinning";
  }

  if (
    value.includes(
      "indoor walking"
    ) ||
    value.includes(
      "indoor-walking"
    ) ||
    value.includes(
      "indoor_walking"
    ) ||
    value.includes(
      "walking"
    )
  ) {
    return "indoor-walking";
  }

  return null;
}

export default function HomeScreen() {
  const [
    screen,
    setScreen,
  ] =
    useState<Screen>("home");

  const [
    setup,
    setSetup,
  ] =
    useState<TrainingSetup | null>(
      null
    );

  const [
    selectedSession,
    setSelectedSession,
  ] =
    useState<LiveSession | null>(
      null
    );

  const {
    setTabBarHidden,
  } = useTabBar();

  const workoutOpen =
    screen === "spinning" ||
    screen ===
      "indoor-walking";

  useEffect(() => {
    setTabBarHidden(
      workoutOpen
    );

    return () => {
      setTabBarHidden(false);
    };
  }, [
    workoutOpen,
    setTabBarHidden,
  ]);

  const openStandaloneDevices =
    () => {
      setSelectedSession(
        null
      );

      setScreen("devices");
    };

  const handleStandaloneReady =
    (
      trainingSetup:
        TrainingSetup
    ) => {
      setSetup(
        trainingSetup
      );

      if (
        trainingSetup.mode ===
        "spinning"
      ) {
        setScreen("spinning");
        return;
      }

      setScreen(
        "indoor-walking"
      );
    };

  const handleSelectSession =
    (
      session: LiveSession
    ) => {
      setSelectedSession(
        session
      );

      setScreen(
        "session-devices"
      );
    };

  const handleSessionReady =
    (
      trainingSetup:
        TrainingSetup
    ) => {
      setSetup(
        trainingSetup
      );

      if (
        trainingSetup.mode ===
        "spinning"
      ) {
        setScreen("spinning");
        return;
      }

      setScreen(
        "indoor-walking"
      );
    };

  const closeWorkout = () => {
    setSetup(null);
    setSelectedSession(
      null
    );
    setScreen("home");
  };

  if (
    screen === "devices"
  ) {
    return (
      <DeviceManager
        onReady={
          handleStandaloneReady
        }
        onBack={() =>
          setScreen("home")
        }
      />
    );
  }

  if (
    screen === "sessions"
  ) {
    return (
      <ActiveSessionsView
        onBack={() =>
          setScreen("home")
        }
        onSelect={
          handleSelectSession
        }
      />
    );
  }

  if (
    screen ===
      "session-devices" &&
    selectedSession
  ) {
    const mode =
      activityToMode(
        selectedSession
          .pass_snapshot
          ?.activity
      );

    /*
     * Om activity saknas eller
     * kommer i okänt format
     * låter vi användaren välja
     * träningsform manuellt.
     */
    return (
      <DeviceManager
        initialMode={mode}
        proPassName={
          selectedSession
            .pass_snapshot
            ?.name ??
          "Pro-pass"
        }
        onBack={() =>
          setScreen(
            "sessions"
          )
        }
        onReady={
          handleSessionReady
        }
      />
    );
  }

  return (
    <>
      <SafeAreaView
        style={
          styles.container
        }
      >
        <View
          style={
            styles.content
          }
        >
          <Text
            style={
              styles.brand
            }
          >
          </Text>

          <View
            style={
              styles.titleRow
            }
          >
            <Text
              style={
                styles.title
              }
            >
              Training Player Pro
            </Text>

            <View
              style={
                styles.badge
              }
            >
              <Text
                style={
                  styles.badgeText
                }
              >
                PRO BETA
              </Text>
            </View>
          </View>

          <Pressable
            style={
              styles.primaryButton
            }
            onPress={
              openStandaloneDevices
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Börja träna
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.secondaryButton
            }
            onPress={() =>
              setScreen(
                "sessions"
              )
            }
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              Anslut till pass
            </Text>
          </Pressable>

          <Text
            style={
              styles.info
            }
          >
            Du kan börja träna
            fristående och ansluta
            till instruktörens pass
            senare.
          </Text>
        </View>
      </SafeAreaView>

      <Modal
        visible={
          workoutOpen &&
          setup !== null
        }
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={
          closeWorkout
        }
      >
        {screen ===
          "spinning" &&
        setup ? (
          <SpinningView
            setup={setup}
            sessionId={
              selectedSession
                ?.id ?? null
            }
            onBack={
              closeWorkout
            }
          />
        ) : null}

        {screen ===
          "indoor-walking" &&
        setup ? (
          <IndoorWalkingView
            setup={setup}
            onBack={
              closeWorkout
            }
          />
        ) : null}
      </Modal>
    </>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#ffffff",
    },

    content: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent:
        "center",
    },

    brand: {
      color: "#E31836",
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 8,
    },

    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 36,
    },

    title: {
      flex: 1,
      fontSize: 32,
      fontWeight: "700",
    },

    badge: {
      backgroundColor:
        "#E31836",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },

    badgeText: {
      color: "#ffffff",
      fontSize: 11,
      fontWeight: "700",
    },

    primaryButton: {
      backgroundColor:
        "#E31836",
      paddingVertical: 18,
      borderRadius: 14,
      alignItems: "center",
    },

    primaryButtonText: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "700",
    },

    secondaryButton: {
      marginTop: 12,
      paddingVertical: 18,
      borderRadius: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#dddddd",
    },

    secondaryButtonText: {
      fontSize: 17,
      fontWeight: "600",
    },

    info: {
      marginTop: 24,
      color: "#777777",
      lineHeight: 20,
    },
  });
