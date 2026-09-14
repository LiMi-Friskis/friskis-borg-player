import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router";

import * as SplashScreen from "expo-splash-screen";

import {
  useColorScheme,
} from "react-native";

import {
  useState,
} from "react";

import {
  AnimatedSplashOverlay,
} from "@/components/animated-icon";

import AppTabs from "@/components/app-tabs";

import {
  TabBarContext,
} from "@/context/TabBarContext";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme =
    useColorScheme();

  const [
    isTabBarHidden,
    setTabBarHidden,
  ] = useState(false);

  return (
    <ThemeProvider
      value={
        colorScheme === "dark"
          ? DarkTheme
          : DefaultTheme
      }
    >
      <TabBarContext.Provider
        value={{
          setTabBarHidden,
        }}
      >
        <AnimatedSplashOverlay />

        <AppTabs
          hidden={isTabBarHidden}
        />
      </TabBarContext.Provider>
    </ThemeProvider>
  );
}