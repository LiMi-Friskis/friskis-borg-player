import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

type Props = {
  hidden?: boolean;
};

export default function AppTabs({
  hidden = false,
}: Props) {
  const scheme = useColorScheme();

  const colors =
    Colors[
      scheme === "unspecified"
        ? "light"
        : scheme
    ];

  return (
    <NativeTabs
      hidden={hidden}
      backgroundColor={
        colors.background
      }
      indicatorColor={
        colors.backgroundElement
      }
      labelStyle={{
        selected: {
          color: colors.text,
        },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>
          Träna
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/home.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>
          Historik
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/explore.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>
          Inställningar
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/explore.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
