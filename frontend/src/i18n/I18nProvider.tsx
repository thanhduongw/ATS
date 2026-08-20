import { useEffect, useState, type ReactNode } from "react";
import { Ctx, translate, type Lang } from "./context";

export function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("ats_lang") as Lang) || "vi");
    useEffect(() => localStorage.setItem("ats_lang", lang), [lang]);
    const t = (key: string) => translate(lang, key);
    return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}
