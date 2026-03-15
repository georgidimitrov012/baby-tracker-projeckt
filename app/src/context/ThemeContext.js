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

const ThemeContext = createContext({
  theme: LIGHT_THEME,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "dark") setIsDark(true);
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  };

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
