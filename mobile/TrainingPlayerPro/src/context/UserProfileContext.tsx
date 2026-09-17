import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY =
  "training-player-pro:user-profile:v1";

export type UserProfile = {
  weightKg: number | null;
  ftpWatts: number | null;
  maxHeartRate: number | null;
  showOtherBluetoothDevices: boolean;
  showIndoorWalking: boolean;
};

type UserProfileContextValue = {
  profile: UserProfile;
  loaded: boolean;
  updateProfile: (
    changes: Partial<UserProfile>
  ) => void;
};

const DEFAULT_PROFILE: UserProfile = {
  weightKg: null,
  ftpWatts: null,
  maxHeartRate: null,
  showOtherBluetoothDevices: false,
  showIndoorWalking: false,
};

const UserProfileContext =
  createContext<UserProfileContextValue>({
    profile: DEFAULT_PROFILE,
    loaded: false,
    updateProfile: () => {},
  });

export function UserProfileProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [profile, setProfile] =
    useState<UserProfile>(
      DEFAULT_PROFILE
    );

  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const stored =
          await AsyncStorage.getItem(
            STORAGE_KEY
          );

        if (
          stored &&
          active
        ) {
          const parsed =
            JSON.parse(stored);

          setProfile({
            weightKg:
              typeof parsed.weightKg ===
              "number"
                ? parsed.weightKg
                : null,

            ftpWatts:
              typeof parsed.ftpWatts ===
              "number"
                ? parsed.ftpWatts
                : null,

            maxHeartRate:
              typeof parsed.maxHeartRate ===
              "number"
                ? parsed.maxHeartRate
                : null,

            showOtherBluetoothDevices:
              parsed.showOtherBluetoothDevices ===
              true,

            showIndoorWalking:
              parsed.showIndoorWalking ===
              true,
          });
        }
      } catch (error) {
        console.warn(
          "Kunde inte läsa användarprofil",
          error
        );
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const updateProfile = (
    changes: Partial<UserProfile>
  ) => {
    setProfile((current) => {
      const next = {
        ...current,
        ...changes,
      };

      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      ).catch((error) => {
        console.warn(
          "Kunde inte spara användarprofil",
          error
        );
      });

      return next;
    });
  };

  const value =
    useMemo(
      () => ({
        profile,
        loaded,
        updateProfile,
      }),
      [profile, loaded]
    );

  return (
    <UserProfileContext.Provider
      value={value}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(
    UserProfileContext
  );
}
