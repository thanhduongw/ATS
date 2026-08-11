import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { viVN, enUS } from "./dictionaries";

export type Lang = "vi" | "en";
interface I18nCtx { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string; }

const Ctx = createContext<I18nCtx>({ lang: "vi", setLang: () => { }, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("ats_lang") as Lang) || "vi");
    useEffect(() => localStorage.setItem("ats_lang", lang), [lang]);
    const t = (key: string) => (lang === "vi" ? viVN : enUS)[key] ?? key;
    return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);