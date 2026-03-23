import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "../i18n/en";
import bg from "../i18n/bg";

const LANG_KEY = "@baby_tracker_language";
const TRANSLATIONS = { en, bg };

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved === "en" || saved === "bg") {
        setLanguage(saved);
      }
    }).catch(() => {});
  }, []);

  const changeLanguage = useCallback(async (lang) => {
    setLanguage(lang);
    try {
      await AsyncStorage.setItem(LANG_KEY, lang);
    } catch (e) {
      console.warn("[LanguageContext] could not persist language:", e);
    }
  }, []);

  const t = useCallback((key, vars = {}) => {
    const dict = TRANSLATIONS[language] ?? en;
    let str = dict[key] ?? en[key] ?? key;
    if (vars && typeof vars === "object") {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v ?? ""));
      });
    }
    return str;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
