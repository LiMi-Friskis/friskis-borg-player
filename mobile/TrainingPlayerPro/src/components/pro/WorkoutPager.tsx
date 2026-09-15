import {
  ReactNode,
  useRef,
  useState,
} from "react";

import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  data: ReactNode;
  pro: ReactNode;
  pass: ReactNode;
};

export default function WorkoutPager({
  data,
  pro,
  pass,
}: Props) {
  const scrollRef =
    useRef<ScrollView>(null);

  const initialized =
    useRef(false);

  const [page, setPage] =
    useState(1);

  const [pageWidth, setPageWidth] =
    useState(0);

  function handleLayout(
    event: LayoutChangeEvent
  ) {
    const width =
      event.nativeEvent.layout.width;

    if (width <= 0) {
      return;
    }

    setPageWidth(width);

    if (!initialized.current) {
      initialized.current = true;

      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          x: width,
          y: 0,
          animated: false,
        });
      });
    }
  }

  function handleMomentumEnd(
    event: NativeSyntheticEvent<
      NativeScrollEvent
    >
  ) {
    if (pageWidth <= 0) {
      return;
    }

    const nextPage =
      Math.round(
        event.nativeEvent
          .contentOffset.x /
          pageWidth
      );

    setPage(
      Math.max(
        0,
        Math.min(2, nextPage)
      )
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
    >
      {pageWidth > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          directionalLockEnabled
          showsHorizontalScrollIndicator={
            false
          }
          onMomentumScrollEnd={
            handleMomentumEnd
          }
          style={styles.scroll}
          contentContainerStyle={
            styles.content
          }
        >
          <View
            style={[
              styles.page,
              {
                width: pageWidth,
              },
            ]}
          >
            {data}
          </View>

          <View
            style={[
              styles.page,
              {
                width: pageWidth,
              },
            ]}
          >
            {pro}
          </View>

          <View
            style={[
              styles.page,
              {
                width: pageWidth,
              },
            ]}
          >
            {pass}
          </View>
        </ScrollView>
      )}

      <View
        pointerEvents="none"
        style={styles.indicator}
      >
        {[0, 1, 2].map(
          (index) => (
            <Text
              key={index}
              style={[
                styles.dot,
                page === index &&
                  styles.dotActive,
              ]}
            >
              ●
            </Text>
          )
        )}
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#0b0b0d",
      overflow: "hidden",
    },

    scroll: {
      flex: 1,
    },

    content: {
      flexGrow: 1,
    },

    page: {
      flex: 1,
      backgroundColor: "#0b0b0d",
    },

    indicator: {
      position: "absolute",
      bottom: 5,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      gap: 7,
    },

    dot: {
      color: "#45454a",
      fontSize: 8,
    },

    dotActive: {
      color: "#ffffff",
    },
  });
