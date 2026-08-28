import { useContext } from "react";
import { Ctx } from "./context";

export const useI18n = () => useContext(Ctx);
