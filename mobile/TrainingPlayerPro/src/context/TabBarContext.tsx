import {
  createContext,
  useContext,
} from "react";

type TabBarContextValue = {
  setTabBarHidden: (
    hidden: boolean
  ) => void;
};

export const TabBarContext =
  createContext<TabBarContextValue>({
    setTabBarHidden: () => {},
  });

export function useTabBar() {
  return useContext(TabBarContext);
}