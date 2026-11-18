import { Tag } from "antd";
import type { DuplicateSignal } from "./types";

const SIGNAL_LABEL: Record<DuplicateSignal, string> = {
  SAME_FILE: "Cùng file CV",
  SAME_EMAIL: "Cùng email",
  SAME_PHONE: "Cùng số điện thoại",
  SIMILAR_PROFILE: "Tên và hồ sơ rất giống",
};

/** Các lý do nghi trùng; tín hiệu chắc chắn tô đỏ, tín hiệu gợi ý tô vàng. */
export function SignalTags({ signals }: { signals: DuplicateSignal[] }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {signals.map((s) => (
        <Tag key={s} color={s === "SIMILAR_PROFILE" ? "gold" : "red"} style={{ marginInlineEnd: 0 }}>
          {SIGNAL_LABEL[s] ?? s}
        </Tag>
      ))}
    </span>
  );
}
