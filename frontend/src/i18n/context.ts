import { createContext } from "react";
import { viVN, enUS } from "./dictionaries";

export type Lang = "vi" | "en";
export interface I18nCtx { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string; }

export const Ctx = createContext<I18nCtx>({ lang: "vi", setLang: () => { }, t: (k) => k });

export const translate = (lang: Lang, key: string) => (lang === "vi" ? viVN : enUS)[key] ?? key;
