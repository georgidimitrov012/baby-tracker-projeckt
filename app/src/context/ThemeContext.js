import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "theme_preference";

export const LIGHT_THEME = {
  dark: false,
  background:    "#FBF8FF",
  surface:       "#FFFFFF",
  card:          "#FFFFFF",
  text:          "#1C1830",
  textSecondary: "#655E80",
  textMuted:     "#A599BE",
  primary:       "#7B5EA7",
  primaryLight:  "#F0EAFF",
  primaryText:   "#7B5EA7",
  accent:        "#F4845F",
  accentLight:   "#FFF0EB",
  border:        "#EDE6FA",
  inputBg:       "#F7F4FE",
  inputText:     "#1C1830",
  placeholder:   "#C4B8D8",
  danger:        "#E05252",
  dangerLight:   "#FDECEC",
  success:       "#47A67E",
  successLight:  "#E8F6F0",
  warning:       "#E88C3A",
  warningLight:  "#FEF3E8",
  headerBg:      "#FFFFFF",
  headerText:    "#1C1830",
  navBg:         "#FBF8FF",
  shadow:        "#7B5EA7",
};

export const DARK_THEME = {
  dark: true,
  background:    "#12101E",
  surface:       "#1C1830",
  card:          "#231F38",
  text:          "#F0EBF9",
  textSecondary: "#C0B0DC",
  textMuted:     "#7A6E9A",
  primary:       "#9B7ED0",
  primaryLight:  "#2A2250",
  primaryText:   "#9B7ED0",
  accent:        "#F4845F",
  accentLight:   "#3A2018",
  border:        "#2E2850",
  inputBg:       "#1C1830",
  inputText:     "#F0EBF9",
  placeholder:   "#5A5075",
  danger:        "#F47070",
  dangerLight:   "#2A1A1A",
  success:       "#6BC99A",
  successLight:  "#152A20",
  warning:       "#F5A660",
  warningLight:  "#2A1E10",
  headerBg:      "#1C1830",
  headerText:    "#F0EBF9",
  navBg:         "#12101E",
  shadow:        "#000000",
};

export const NIGHT_THEME = {
  dark: true,
  background:    "#0A0500",
  surface:       "#140A00",
  card:          "#1C0F00",
  text:          "#FF9966",
  textSecondary: "#CC6633",
  textMuted:     "#803D1A",
  primary:       "#CC5500",
  primaryLight:  "#2A0D00",
  primaryText:   "#FF7733",
  accent:        "#FF6600",
  accentLight:   "#2A0D00",
  border:        "#2A1200",
  inputBg:       "#140A00",
  inputText:     "#FF9966",
  placeholder:   "#662200",
  danger:        "#FF5533",
  dangerLight:   "#2A0A00",
  success:       "#CC8833",
  successLight:  "#1A0F00",
  warning:       "#FF9933",
  warningLight:  "#1F0C00",
  headerBg:      "#140A00",
  headerText:    "#FF9966",
  navBg:         "#0A0500",
  shadow:        "#000000",
};

const NIGHT_MODE_KEY = "night_mode_enabled";

const ThemeContext = createContext({
  theme: LIGHT_THEME,
  isDark: false,
  isNight: false,
  nightModeEnabled: true,
  toggleTheme: () => {},
  toggleNightMode: () => {},
});

function getIsNight() {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 6;
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [nightModeEnabled, setNightModeEnabled] = useState(true);
  const [isNight, setIsNight] = useState(getIsNight);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "dark") setIsDark(true);
    });
    AsyncStorage.getItem(NIGHT_MODE_KEY).then((val) => {
      if (val === "false") setNightModeEnabled(false);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsNight(getIsNight());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  };

  const toggleNightMode = async () => {
    const next = !nightModeEnabled;
    setNightModeEnabled(next);
    await AsyncStorage.setItem(NIGHT_MODE_KEY, next ? "true" : "false");
  };

  const theme = nightModeEnabled && isNight ? NIGHT_THEME : isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, isDark, isNight, nightModeEnabled, toggleTheme, toggleNightMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
