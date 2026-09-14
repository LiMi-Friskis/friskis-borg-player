import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useActiveSessions,
} from "../hooks/useActiveSessions";

import {
  LiveSession,
  LiveSessionStatus,
} from "../types/liveSession";

type Props = {
  onBack: () => void;
  onSelect: (
    session: LiveSession
  ) => void;
};

function statusText(
  status: LiveSessionStatus
) {
  switch (status) {
    case "ready":
      return "Väntar på start";

    case "countdown":
      return "Startar snart";

    case "running":
      return "Pågår";

    case "paused":
      return "Pausad";

    case "finished":
      return "Avslutad";
  }
}

function activityText(
  activity: unknown
) {
  if (!activity) {
    return "Träningspass";
  }

  if (
    typeof activity === "object"
  ) {
    const objectActivity =
      activity as {
        name?: unknown;
        label?: unknown;
        id?: unknown;
      };

    const candidate =
      objectActivity.name ??
      objectActivity.label ??
      objectActivity.id;

    if (
      typeof candidate ===
      "string"
    ) {
      return activityText(
        candidate
      );
    }

    return "Träningspass";
  }

  const value =
    String(activity)
      .trim()
      .toLowerCase();

  if (
    value === "spinning"
  ) {
    return "Spinning";
  }

  if (
    value ===
      "indoor-walking" ||
    value ===
      "indoor_walking" ||
    value ===
      "indoor walking"
  ) {
    return "Indoor Walking";
  }

  return String(activity);
}

export default function ActiveSessionsView({
  onBack,
  onSelect,
}: Props) {
  const {
    sessions,
    loading,
    error,
    refresh,
  } = useActiveSessions();

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View
        style={styles.topBar}
      >
        <Pressable
          onPress={onBack}
          hitSlop={12}
        >
          <Text
            style={styles.back}
          >
            ‹ Tillbaka
          </Text>
        </Pressable>

        <Text
          style={styles.brand}
        >
          Friskis
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <Text
          style={styles.eyebrow}
        >
          TRAINING PLAYER PRO
        </Text>

        <Text
          style={styles.title}
        >
          Aktiva pass
        </Text>

        <Text
          style={styles.intro}
        >
          Välj instruktörens pass
          för att ansluta.
        </Text>

        {loading ? (
          <View
            style={
              styles.messageCard
            }
          >
            <Text
              style={
                styles.messageTitle
              }
            >
              Söker efter pass…
            </Text>
          </View>
        ) : null}

        {!loading &&
        error ? (
          <View
            style={
              styles.messageCard
            }
          >
            <Text
              style={
                styles.errorTitle
              }
            >
              Kunde inte hämta
              passen
            </Text>

            <Text
              style={
                styles.messageText
              }
            >
              {error}
            </Text>

            <Pressable
              style={
                styles.retryButton
              }
              onPress={refresh}
            >
              <Text
                style={
                  styles.retryText
                }
              >
                Försök igen
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!loading &&
        !error &&
        sessions.length ===
          0 ? (
          <View
            style={
              styles.messageCard
            }
          >
            <Text
              style={
                styles.messageTitle
              }
            >
              Inga aktiva pass
            </Text>

            <Text
              style={
                styles.messageText
              }
            >
              När en instruktör
              väljer KÖR MED PRO
              visas passet här.
            </Text>

            <Pressable
              style={
                styles.retryButton
              }
              onPress={refresh}
            >
              <Text
                style={
                  styles.retryText
                }
              >
                Uppdatera
              </Text>
            </Pressable>
          </View>
        ) : null}

        {sessions.map(
          (session) => {
            const snapshot =
              session.pass_snapshot;

            const host =
              snapshot?.hostName;

            return (
              <Pressable
                key={session.id}
                style={
                  styles.sessionCard
                }
                onPress={() =>
                  onSelect(
                    session
                  )
                }
              >
                <View
                  style={
                    styles.sessionTop
                  }
                >
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.sessionName
                      }
                    >
                      {snapshot
                        ?.name ??
                        "Träningspass"}
                    </Text>

                    <Text
                      style={
                        styles.sessionMeta
                      }
                    >
                      {activityText(
                        snapshot
                          ?.activity
                      )}

                      {host
                        ? ` · med ${host}`
                        : ""}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      session.status ===
                        "running" &&
                        styles.statusRunning,
                      session.status ===
                        "paused" &&
                        styles.statusPaused,
                    ]}
                  >
                    <Text
                      style={
                        styles.statusText
                      }
                    >
                      {statusText(
                        session.status
                      )}
                    </Text>
                  </View>
                </View>

                <Text
                  style={
                    styles.joinText
                  }
                >
                  Anslut →
                </Text>
              </Pressable>
            );
          }
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#0b0b0d",
    },

    topBar: {
      height: 58,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    back: {
      color: "#d0d0d4",
      fontSize: 17,
      fontWeight: "600",
    },

    brand: {
      color: "#E31836",
      fontSize: 16,
      fontWeight: "800",
    },

    content: {
      paddingHorizontal: 20,
      paddingBottom: 30,
    },

    eyebrow: {
      marginTop: 18,
      color: "#E31836",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.6,
    },

    title: {
      marginTop: 7,
      color: "#ffffff",
      fontSize: 34,
      fontWeight: "800",
    },

    intro: {
      color: "#8f8f95",
      fontSize: 15,
      marginTop: 8,
      marginBottom: 24,
      lineHeight: 21,
    },

    sessionCard: {
      backgroundColor:
        "#18181b",
      borderRadius: 19,
      padding: 17,
      marginBottom: 12,
    },

    sessionTop: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 12,
    },

    sessionName: {
      color: "#ffffff",
      fontSize: 19,
      fontWeight: "800",
    },

    sessionMeta: {
      color: "#85858b",
      fontSize: 13,
      marginTop: 5,
    },

    statusBadge: {
      backgroundColor:
        "#29292d",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },

    statusRunning: {
      backgroundColor:
        "#16301e",
    },

    statusPaused: {
      backgroundColor:
        "#3a2e16",
    },

    statusText: {
      color: "#ffffff",
      fontSize: 10,
      fontWeight: "800",
    },

    joinText: {
      marginTop: 17,
      color: "#E31836",
      fontSize: 14,
      fontWeight: "800",
    },

    messageCard: {
      backgroundColor:
        "#18181b",
      borderRadius: 19,
      padding: 20,
    },

    messageTitle: {
      color: "#ffffff",
      fontSize: 18,
      fontWeight: "800",
    },

    errorTitle: {
      color: "#ff6b78",
      fontSize: 18,
      fontWeight: "800",
    },

    messageText: {
      color: "#89898f",
      lineHeight: 20,
      marginTop: 7,
    },

    retryButton: {
      alignSelf:
        "flex-start",
      marginTop: 18,
      backgroundColor:
        "#2a2a2e",
      borderRadius: 12,
      paddingHorizontal: 15,
      paddingVertical: 10,
    },

    retryText: {
      color: "#ffffff",
      fontWeight: "700",
    },
  });
