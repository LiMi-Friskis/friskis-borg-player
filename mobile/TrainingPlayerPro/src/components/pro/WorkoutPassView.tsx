import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ProHeader from "./ProHeader";
import WorkoutTrainingControl from "./WorkoutTrainingControl";

type DisplayTarget = {
  label: string;
  value: string;
};

export type PassDisplayBlock = {
  id: string;
  title: string;
  instruction: string;
  durationSeconds: number;
  color: string;
  targets: DisplayTarget[];
  intensityValue: number | null;
  intensityHeightPercent: number | null;
};

type Props = {
  passName: string;
  blocks: PassDisplayBlock[];
  currentBlockIndex: number;
  blockRemaining: number;
  sessionElapsed: number;
  recording: boolean;
  onStartTraining: () => void;
  onStopTraining: () => void;
  onBack: () => void;
  live: boolean;
  statusLabel: string;
};

function formatTime(seconds: number) {
  const safe = Math.max(
    0,
    Math.round(seconds)
  );

  const minutes = Math.floor(
    safe / 60
  );

  const rest = safe % 60;

  return `${minutes}:${String(
    rest
  ).padStart(2, "0")}`;
}

function intensityHeight(
  value: number | null
) {
  if (value === null) {
    return 50;
  }

  /*
   * Samma Borg-skala som webbappen:
   * 6 = minst 15 %
   * 20 = 100 %
   */
  return Math.max(
    15,
    Math.min(
      100,
      ((value - 6) / 14) * 100
    )
  );
}

export default function WorkoutPassView({
  passName,
  blocks,
  currentBlockIndex,
  blockRemaining,
  sessionElapsed,
  recording,
  onStartTraining,
  onStopTraining,
  onBack,
  live,
  statusLabel,
}: Props) {
  const currentBlock =
    blocks[currentBlockIndex] ??
    blocks[0] ??
    null;

  const nextBlock =
    blocks[currentBlockIndex + 1] ??
    null;

  const totalSeconds =
    blocks.reduce(
      (sum, block) =>
        sum +
        block.durationSeconds,
      0
    );

  const progress =
    totalSeconds > 0
      ? Math.min(
          1,
          Math.max(
            0,
            sessionElapsed /
              totalSeconds
          )
        )
      : 0;

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
          title={passName}
          subtitle="Pass"
        />

        {currentBlock ? (
          <>
            <View
              style={[
                styles.currentCard,
                {
                  borderColor:
                    currentBlock.color,
                },
              ]}
            >
              <View
                style={[
                  styles.colorBar,
                  {
                    backgroundColor:
                      currentBlock.color,
                  },
                ]}
              />

              <Text
                style={styles.remaining}
              >
                {formatTime(
                  blockRemaining
                )}
              </Text>

              <Text
                style={
                  styles.remainingLabel
                }
              >
                KVAR I BLOCK
              </Text>

              <Text
                style={styles.blockTitle}
              >
                {currentBlock.title}
              </Text>

              {!!currentBlock.instruction && (
                <Text
                  style={
                    styles.instruction
                  }
                  numberOfLines={2}
                >
                  {
                    currentBlock.instruction
                  }
                </Text>
              )}

              <View
                style={styles.targets}
              >
                {currentBlock.targets.map(
                  (target, index) => (
                    <View
                      key={`${target.label}-${index}`}
                      style={
                        styles.target
                      }
                    >
                      <Text
                        style={
                          styles.targetLabel
                        }
                      >
                        {target.label}
                      </Text>

                      <Text
                        style={
                          styles.targetValue
                        }
                      >
                        {target.value}
                      </Text>
                    </View>
                  )
                )}
              </View>
            </View>

            <View
              style={styles.nextArea}
            >
              <Text
                style={styles.sectionLabel}
              >
                NÄSTA
              </Text>

              {nextBlock ? (
                <View
                  style={styles.nextRow}
                >
                  <View
                    style={[
                      styles.nextColor,
                      {
                        backgroundColor:
                          nextBlock.color,
                      },
                    ]}
                  />

                  <View
                    style={styles.nextText}
                  >
                    <Text
                      style={
                        styles.nextTitle
                      }
                      numberOfLines={1}
                    >
                      {nextBlock.title}
                    </Text>

                    {nextBlock
                      .targets[0] && (
                      <Text
                        style={
                          styles.nextTarget
                        }
                        numberOfLines={1}
                      >
                        {
                          nextBlock
                            .targets[0]
                            .label
                        }
                        {"  "}
                        {
                          nextBlock
                            .targets[0]
                            .value
                        }
                      </Text>
                    )}
                  </View>

                  <Text
                    style={
                      styles.nextDuration
                    }
                  >
                    {formatTime(
                      nextBlock.durationSeconds
                    )}
                  </Text>
                </View>
              ) : (
                <Text
                  style={styles.noNext}
                >
                  Sista blocket
                </Text>
              )}
            </View>

            <View
              style={styles.timelineArea}
            >
              <View
                style={styles.timeline}
              >
                {blocks.map(
                  (block) => {
                    const width =
                      totalSeconds > 0
                        ? `${
                            (block.durationSeconds /
                              totalSeconds) *
                            100
                          }%`
                        : "0%";

                    const height =
                      block.intensityHeightPercent !== null
                        ? Math.max(
                            0,
                            Math.min(
                              100,
                              block.intensityHeightPercent
                            )
                          )
                        : intensityHeight(
                            block.intensityValue
                          );

                    return (
                      <View
                        key={block.id}
                        style={[
                          styles.timelineBlockSlot,
                          {
                            width:
                              width as any,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.timelineBlock,
                            {
                              height:
                                Math.max(
                                  3,
                                  (82 * height) / 100
                                ),
                              backgroundColor:
                                block.color,
                            },
                          ]}
                        />
                      </View>
                    );
                  }
                )}

                <View
                  style={[
                    styles.marker,
                    {
                      left:
                        `${
                          progress *
                          100
                        }%` as any,
                    },
                  ]}
                />
              </View>

              <View
                style={
                  styles.timelineLabels
                }
              >
                <Text
                  style={
                    styles.timelineText
                  }
                >
                  {formatTime(
                    sessionElapsed
                  )}
                </Text>

                <Text
                  style={
                    styles.timelineText
                  }
                >
                  {formatTime(
                    totalSeconds
                  )}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View
            style={styles.emptyState}
          >
            <Text
              style={styles.emptyTitle}
            >
              PASSDATA SAKNAS
            </Text>

            <Text
              style={styles.emptyText}
            >
              Väntar på passets block.
            </Text>
          </View>
        )}

        <WorkoutTrainingControl
          recording={recording}
          onStart={onStartTraining}
          onStop={onStopTraining}
        />
      </View>
    </SafeAreaView>
  );
}


/*
 * Lokal TopBar för att matcha
 * Data/Pass-vyn utan att röra
 * SpinningView.
 */
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
      <Text
        style={styles.back}
        onPress={onBack}
      >
        ‹ Avsluta
      </Text>

      <View
        style={[
          styles.statusBadge,
          live &&
            styles.statusBadgeLive,
        ]}
      >
        <Text
          style={styles.statusText}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 94,
  },

  topBar: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  back: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#27272a",
  },

  statusBadgeLive: {
    backgroundColor: "#E31836",
  },

  statusText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  currentCard: {
    marginTop: 10,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: "#18181b",
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingBottom: 17,
    alignItems: "center",
  },

  colorBar: {
    height: 7,
    alignSelf: "stretch",
    marginHorizontal: -18,
    marginBottom: 12,
  },

  remaining: {
    color: "#ffffff",
    fontSize: 46,
    lineHeight: 50,
    fontWeight: "900",
    fontVariant: [
      "tabular-nums",
    ],
  },

  remainingLabel: {
    color: "#a1a1aa",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginTop: 1,
  },

  blockTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 11,
  },

  instruction: {
    color: "#d4d4d8",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 4,
  },

  targets: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  target: {
    minWidth: 90,
    backgroundColor: "#27272a",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },

  targetLabel: {
    color: "#a1a1aa",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  targetValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },

  nextArea: {
    marginTop: 16,
  },

  sectionLabel: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 7,
  },

  nextRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    borderRadius: 16,
    paddingHorizontal: 12,
  },

  nextColor: {
    width: 5,
    height: 34,
    borderRadius: 3,
    marginRight: 11,
  },

  nextText: {
    flex: 1,
  },

  nextTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  nextTarget: {
    color: "#a1a1aa",
    fontSize: 11,
    marginTop: 2,
  },

  nextDuration: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    fontVariant: [
      "tabular-nums",
    ],
  },

  noNext: {
    color: "#a1a1aa",
    fontSize: 14,
  },

  timelineArea: {
    marginTop: 18,
  },

  timeline: {
    height: 82,
    flexDirection: "row",
    alignItems: "flex-end",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#09090b",
    borderBottomWidth: 1,
    borderBottomColor: "#52525b",
  },

  timelineBlockSlot: {
    height: "100%",
    justifyContent: "flex-end",
    paddingRight: 1,
  },

  timelineBlock: {
    width: "100%",
    minHeight: 3,
  },

  marker: {
    position: "absolute",
    top: -2,
    bottom: -2,
    width: 3,
    marginLeft: -1.5,
    backgroundColor: "#ffffff",
    borderRadius: 2,
  },

  timelineLabels: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginTop: 5,
  },

  timelineText: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "700",
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },

  emptyText: {
    color: "#a1a1aa",
    fontSize: 13,
    marginTop: 5,
  },
});
