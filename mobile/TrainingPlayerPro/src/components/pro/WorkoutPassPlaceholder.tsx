import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ProHeader from "./ProHeader";

import {
  LiveSession,
  LiveSessionStatus,
} from "../../types/liveSession";

type Props = {
  passName?: string | null;
  connected: boolean;
  onBack: () => void;
  live: boolean;
  statusLabel: string;
  recording: boolean;
  onStartTraining: () => void;
  onStopTraining: () => void;

  sessions?: LiveSession[];
  sessionsLoading?: boolean;
  sessionsError?: string | null;
  onRefreshSessions?: () => void;
  onSelectSession?: (
    sessionId: string
  ) => void;
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

function statusText(
  status: LiveSessionStatus
) {
  switch (status) {
    case "ready":
      return "Väntar";
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
        code?: unknown;
      };

    const candidate =
      objectActivity.name ??
      objectActivity.label ??
      objectActivity.code ??
      objectActivity.id;

    if (
      typeof candidate === "string"
    ) {
      return activityText(candidate);
    }

    return "Träningspass";
  }

  const value = String(activity)
    .trim()
    .toLowerCase();

  if (value === "spinning") {
    return "Spinning";
  }

  if (
    value === "indoor-walking" ||
    value === "indoor_walking" ||
    value === "indoor walking"
  ) {
    return "Indoor Walking";
  }

  return String(activity);
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
  sessions = [],
  sessionsLoading = false,
  sessionsError = null,
  onRefreshSessions,
  onSelectSession,
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          <Text style={styles.eyebrow}>
            PASS
          </Text>

          {connected ? (
            <>
              <Text style={styles.title}>
                Passvyn kommer här
              </Text>

              <Text style={styles.text}>
                {passName ??
                  "Anslutet pass"}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>
                Inget pass anslutet
              </Text>

              <Text style={styles.text}>
                Klicka på ett pass för
                att ansluta.
              </Text>

              {sessionsLoading ? (
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
                    Söker efter aktiva
                    pass…
                  </Text>
                </View>
              ) : null}

              {!sessionsLoading &&
              sessionsError ? (
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
                    {sessionsError}
                  </Text>

                  {onRefreshSessions ? (
                    <Pressable
                      style={
                        styles.retryButton
                      }
                      onPress={
                        onRefreshSessions
                      }
                    >
                      <Text
                        style={
                          styles.retryText
                        }
                      >
                        Försök igen
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {!sessionsLoading &&
              !sessionsError &&
              sessions.length === 0 ? (
                <View
                  style={
                    styles.emptyArea
                  }
                >
                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Inga aktiva pass
                  </Text>
                </View>
              ) : null}

              {!sessionsLoading &&
              !sessionsError
                ? sessions.map(
                    (session) => {
                      const snapshot =
                        session.pass_snapshot;

                      return (
                        <Pressable
                          key={
                            session.id
                          }
                          style={
                            styles.sessionCard
                          }
                          onPress={() =>
                            onSelectSession?.(
                              session.id
                            )
                          }
                        >
                          <View
                            style={
                              styles.sessionTop
                            }
                          >
                            <View
                              style={
                                styles.sessionInfo
                              }
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
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.sessionStatus,
                                session.status ===
                                  "running" &&
                                  styles.sessionStatusRunning,
                                session.status ===
                                  "paused" &&
                                  styles.sessionStatusPaused,
                              ]}
                            >
                              <Text
                                style={
                                  styles.sessionStatusText
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
                  )
                : null}
            </>
          )}
        </ScrollView>

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
            style={
              styles.trainingButtonText
            }
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

    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingTop: 22,
      paddingBottom: 24,
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
      marginTop: 10,
    },

    text: {
      color: "#8e8e94",
      fontSize: 14,
      lineHeight: 20,
      marginTop: 8,
      marginBottom: 22,
    },

    sessionCard: {
      backgroundColor: "#18181b",
      borderRadius: 18,
      padding: 17,
      marginBottom: 12,
    },

    sessionTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },

    sessionInfo: {
      flex: 1,
    },

    sessionName: {
      color: "#ffffff",
      fontSize: 18,
      fontWeight: "800",
    },

    sessionMeta: {
      color: "#85858b",
      fontSize: 13,
      marginTop: 5,
    },

    sessionStatus: {
      backgroundColor: "#29292d",
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },

    sessionStatusRunning: {
      backgroundColor: "#16301e",
    },

    sessionStatusPaused: {
      backgroundColor: "#3a2e16",
    },

    sessionStatusText: {
      color: "#ffffff",
      fontSize: 10,
      fontWeight: "800",
    },

    joinText: {
      marginTop: 15,
      color: "#E31836",
      fontSize: 14,
      fontWeight: "800",
    },

    emptyArea: {
      minHeight: 130,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#141416",
      borderRadius: 18,
      padding: 20,
    },

    emptyText: {
      color: "#8e8e94",
      fontSize: 16,
      fontWeight: "700",
    },

    messageCard: {
      backgroundColor: "#18181b",
      borderRadius: 18,
      padding: 18,
    },

    messageTitle: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "800",
    },

    errorTitle: {
      color: "#ff6b78",
      fontSize: 16,
      fontWeight: "800",
    },

    messageText: {
      color: "#89898f",
      lineHeight: 20,
      marginTop: 7,
    },

    retryButton: {
      alignSelf: "flex-start",
      marginTop: 15,
      backgroundColor: "#2a2a2e",
      borderRadius: 12,
      paddingHorizontal: 15,
      paddingVertical: 10,
    },

    retryText: {
      color: "#ffffff",
      fontWeight: "700",
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
