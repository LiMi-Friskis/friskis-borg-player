import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useLiveSession,
} from "../hooks/useLiveSession";

import {
  formatTrainingTime,
} from "../hooks/useTrainingSession";

type Props = {
  sessionId: string;
  onBack: () => void;
};

export default function LiveSessionView({
  sessionId,
  onBack,
}: Props) {
  const {
    session,
    loading,
    error,
    currentPositionSeconds,
    countdownRemainingSeconds,
    currentBlock,
  } = useLiveSession(
    sessionId
  );

  if (loading) {
    return (
      <ScreenFrame
        onBack={onBack}
      >
        <Text
          style={styles.centerTitle}
        >
          Ansluter…
        </Text>
      </ScreenFrame>
    );
  }

  if (
    error ||
    !session
  ) {
    return (
      <ScreenFrame
        onBack={onBack}
      >
        <Text
          style={styles.centerTitle}
        >
          Kunde inte ansluta
        </Text>

        <Text
          style={styles.centerText}
        >
          {error ??
            "Sessionen finns inte längre."}
        </Text>
      </ScreenFrame>
    );
  }

  const snapshot =
    session.pass_snapshot;

  if (
    session.status ===
    "ready"
  ) {
    return (
      <ScreenFrame
        onBack={onBack}
      >
        <Text
          style={styles.eyebrow}
        >
          ANSLUTEN
        </Text>

        <Text
          style={styles.passName}
        >
          {snapshot.name}
        </Text>

        {snapshot.hostName ? (
          <Text
            style={styles.host}
          >
            med{" "}
            {snapshot.hostName}
          </Text>
        ) : null}

        <View
          style={styles.hero}
        >
          <Text
            style={
              styles.heroLabel
            }
          >
            VÄNTAR PÅ
            INSTRUKTÖREN
          </Text>

          <Text
            style={
              styles.heroValue
            }
          >
            Redo
          </Text>

          <Text
            style={
              styles.heroHint
            }
          >
            Passet startar
            automatiskt här när
            instruktören trycker
            start.
          </Text>
        </View>
      </ScreenFrame>
    );
  }

  if (
    session.status ===
    "countdown"
  ) {
    return (
      <ScreenFrame
        onBack={onBack}
      >
        <Text
          style={styles.eyebrow}
        >
          {snapshot.name}
        </Text>

        <View
          style={
            styles.countdownArea
          }
        >
          <Text
            style={
              styles.countdownLabel
            }
          >
            PASS STARTAR OM
          </Text>

          <Text
            style={
              styles.countdown
            }
          >
            {
              countdownRemainingSeconds
            }
          </Text>
        </View>
      </ScreenFrame>
    );
  }

  if (
    session.status ===
    "paused"
  ) {
    return (
      <RunningFrame
        onBack={onBack}
        passName={
          snapshot.name
        }
        position={
          currentPositionSeconds
        }
        blockName={
          currentBlock?.name ??
          "Pass"
        }
        blockColor={
          currentBlock?.color
        }
        paused
      />
    );
  }

  if (
    session.status ===
    "finished"
  ) {
    return (
      <ScreenFrame
        onBack={onBack}
      >
        <Text
          style={styles.eyebrow}
        >
          {snapshot.name}
        </Text>

        <View
          style={styles.hero}
        >
          <Text
            style={
              styles.heroLabel
            }
          >
            PASSET ÄR AVSLUTAT
          </Text>

          <Text
            style={
              styles.heroValue
            }
          >
            Klart!
          </Text>

          <Text
            style={
              styles.heroHint
            }
          >
            Instruktören har
            avslutat Pro-passet.
          </Text>
        </View>
      </ScreenFrame>
    );
  }

  return (
    <RunningFrame
      onBack={onBack}
      passName={snapshot.name}
      position={
        currentPositionSeconds
      }
      blockName={
        currentBlock?.name ??
        "Pass"
      }
      blockColor={
        currentBlock?.color
      }
    />
  );
}

function ScreenFrame({
  onBack,
  children,
}: {
  onBack: () => void;
  children:
    React.ReactNode;
}) {
  return (
    <SafeAreaView
      style={styles.container}
    >
      <View
        style={styles.topBar}
      >
        <Pressable
          onPress={onBack}
        >
          <Text
            style={styles.back}
          >
            ‹ Lämna pass
          </Text>
        </Pressable>

        <View
          style={
            styles.liveBadge
          }
        >
          <View
            style={styles.liveDot}
          />
          <Text
            style={styles.liveText}
          >
            LIVE
          </Text>
        </View>
      </View>

      <View
        style={styles.content}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

function RunningFrame({
  onBack,
  passName,
  position,
  blockName,
  blockColor,
  paused = false,
}: {
  onBack: () => void;
  passName: string;
  position: number;
  blockName: string;
  blockColor?:
    | string
    | null;
  paused?: boolean;
}) {
  return (
    <ScreenFrame
      onBack={onBack}
    >
      <Text
        style={styles.eyebrow}
      >
        {passName}
      </Text>

      <Text
        style={styles.passTime}
      >
        {formatTrainingTime(
          position
        )}
      </Text>

      <Text
        style={
          styles.passTimeLabel
        }
      >
        PASSTID
      </Text>

      <View
        style={[
          styles.blockCard,
          {
            borderTopColor:
              blockColor ??
              "#E31836",
          },
        ]}
      >
        <Text
          style={
            styles.blockLabel
          }
        >
          AKTUELLT BLOCK
        </Text>

        <Text
          style={
            styles.blockName
          }
        >
          {blockName}
        </Text>
      </View>

      {paused ? (
        <View
          style={
            styles.pauseBanner
          }
        >
          <Text
            style={
              styles.pauseText
            }
          >
            PASS PAUSAT
          </Text>
        </View>
      ) : (
        <Text
          style={
            styles.syncText
          }
        >
          Synkad med
          instruktörens Player
        </Text>
      )}
    </ScreenFrame>
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
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    back: {
      color: "#d0d0d4",
      fontSize: 17,
      fontWeight: "600",
    },

    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor:
        "#16261b",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },

    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        "#48c968",
    },

    liveText: {
      color: "#ffffff",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.5,
    },

    content: {
      flex: 1,
      paddingHorizontal: 22,
      paddingBottom: 30,
    },

    eyebrow: {
      color: "#E31836",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.4,
      marginTop: 22,
    },

    passName: {
      color: "#ffffff",
      fontSize: 34,
      fontWeight: "800",
      marginTop: 8,
    },

    host: {
      color: "#8d8d93",
      fontSize: 17,
      marginTop: 5,
    },

    hero: {
      marginTop: 70,
      alignItems: "center",
      backgroundColor:
        "#18181b",
      borderRadius: 24,
      paddingVertical: 42,
      paddingHorizontal: 24,
    },

    heroLabel: {
      color: "#85858b",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.6,
      textAlign: "center",
    },

    heroValue: {
      color: "#ffffff",
      fontSize: 48,
      fontWeight: "800",
      marginTop: 12,
    },

    heroHint: {
      color: "#85858b",
      fontSize: 14,
      textAlign: "center",
      lineHeight: 21,
      marginTop: 16,
      maxWidth: 270,
    },

    countdownArea: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
    },

    countdownLabel: {
      color: "#85858b",
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 2,
    },

    countdown: {
      color: "#ffffff",
      fontSize: 130,
      lineHeight: 145,
      fontWeight: "800",
      fontVariant: [
        "tabular-nums",
      ],
    },

    passTime: {
      color: "#ffffff",
      fontSize: 57,
      fontWeight: "800",
      marginTop: 45,
      fontVariant: [
        "tabular-nums",
      ],
    },

    passTimeLabel: {
      color: "#77777d",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.5,
      marginTop: 3,
    },

    blockCard: {
      backgroundColor:
        "#18181b",
      borderRadius: 20,
      borderTopWidth: 5,
      padding: 20,
      marginTop: 35,
    },

    blockLabel: {
      color: "#85858b",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.4,
    },

    blockName: {
      color: "#ffffff",
      fontSize: 30,
      fontWeight: "800",
      marginTop: 7,
    },

    pauseBanner: {
      marginTop: 22,
      backgroundColor:
        "#3a2e16",
      borderRadius: 16,
      padding: 17,
      alignItems: "center",
    },

    pauseText: {
      color: "#ffffff",
      fontSize: 18,
      fontWeight: "800",
      letterSpacing: 1.5,
    },

    syncText: {
      color: "#69696f",
      fontSize: 13,
      marginTop: 20,
      textAlign: "center",
    },

    centerTitle: {
      color: "#ffffff",
      fontSize: 25,
      fontWeight: "800",
      textAlign: "center",
      marginTop: 120,
    },

    centerText: {
      color: "#8e8e94",
      fontSize: 14,
      textAlign: "center",
      marginTop: 10,
    },
  });
