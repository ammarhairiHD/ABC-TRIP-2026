import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import ms from "../locales/ms.json";
import ne from "../locales/ne.json";

// English-only launch (root CLAUDE.md): ms/ne resources stay bundled so the
// plumbing exists, but i18next only ever runs in "en" until the language
// switcher turns them on for real.
void i18next.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: en },
    ms: { translation: ms },
    ne: { translation: ne },
  },
  interpolation: { escapeValue: false },
});

export default i18next;
