import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "theme_preference";

export const LIGHT_THEME = {
  dark: false,
  background:    "#f8f9fa",
  surface:       "#ffffff",
  card:          "#ffffff",
  text:          "#1a1a2e",
  textSecondary: "#555555",
  textMuted:     "#999999",
  primary:       "#1565c0",
  primaryLight:  "#e3f2fd",
  primaryText:   "#1565c0",
  border:        "#dddddd",
  inputBg:       "#ffffff",
  inputText:     "#111111",
  placeholder:   "#bbbbbb",
  danger:        "#c62828",
  dangerLight:   "#fde8e8",
  success:       "#2e7d32",
  successLight:  "#e8f5e9",
  warning:       "#e65100",
  warningLight:  "#fff8e1",
  headerBg:      "#ffffff",
  headerText:    "#1a1a2e",
  navBg:         "#f8f9fa",
  shadow:        "#000000",
};

export const DARK_THEME = {
  dark: true,
  background:    "#0d0d0d",
  surface:       "#1a1a1a",
  card:          "#222222",
  text:          "#f0f0f0",
  textSecondary: "#aaaaaa",
  textMuted:     "#666666",
  primary:       "#4a90e2",
  primaryLight:  "#1a2a4a",
  primaryText:   "#4a90e2",
  border:        "#333333",
  inputBg:       "#2a2a2a",
  inputText:     "#f0f0f0",
  placeholder:   "#555555",
  danger:        "#ef5350",
  dangerLight:   "#2a1515",
  success:       "#66bb6a",
  successLight:  "#152a15",
  warning:       "#ffa726",
  warningLight:  "#2a2010",
  headerBg:      "#1a1a1a",
  headerText:    "#f0f0f0",
  navBg:         "#0d0d0d",
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
