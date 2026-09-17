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
  useEffect,
  useState,
} from "react";

import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";

import {
  AnimatedSplashOverlay,
} from "@/components/animated-icon";

import AppTabs from "@/components/app-tabs";

import {
  TabBarContext,
} from "@/context/TabBarContext";
import {
  UserProfileProvider,
} from "@/context/UserProfileContext";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme =
    useColorScheme();

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const [
    isTabBarHidden,
    setTabBarHidden,
  ] = useState(false);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider
      value={
        colorScheme === "dark"
          ? DarkTheme
          : DefaultTheme
      }
    >
      <UserProfileProvider>
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
      </UserProfileProvider>
    </ThemeProvider>
  );
}