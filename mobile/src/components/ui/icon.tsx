import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Platform, type ColorValue } from "react-native";
import { COLORS, SIZES } from "@/theme";

type Shape =
  | { t: "path"; d: string }
  | { t: "rect"; x: number; y: number; w: number; h: number; rx: number }
  | { t: "circle"; cx: number; cy: number; r: number };

const p = (d: string): Shape => ({ t: "path", d });
const rect = (x: number, y: number, w: number, h: number, rx: number): Shape => ({ t: "rect", x, y, w, h, rx });
const circle = (cx: number, cy: number, r: number): Shape => ({ t: "circle", cx, cy, r });

/**
 * Bộ icon chép NGUYÊN từ canvas M01–M20: lưới 24, nét 1.5, đầu nét tròn. Muốn thêm icon thì
 * lấy từ canvas trước; icon canvas không có (đánh dấu `ngoài canvas`) thì vẽ cùng phong cách.
 */
const ICONS = {
  mail: [rect(3, 5, 18, 14, 3), p("m3.5 6.5 8.5 6 8.5-6")],
  lock: [rect(5, 10.5, 14, 10, 3), p("M8 10.5V7.5a4 4 0 0 1 8 0v3")],
  eye: [p("M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"), circle(12, 12, 3)],
  /** ngoài canvas */
  eyeOff: [
    p("M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"),
    circle(12, 12, 3),
    p("M4 4l16 16"),
  ],
  back: [p("M19 12H5M11 6l-6 6 6 6")],
  bell: [p("M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"), p("M10 20.5a2 2 0 0 0 4 0")],
  search: [circle(11, 11, 6.5), p("m16 16 4.5 4.5")],
  briefcase: [
    rect(3, 7, 18, 13, 3),
    p("M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7"),
    p("M3 12.5h18"),
  ],
  document: [
    p("M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"),
    p("M14 3v5h5"),
    p("M9 13h6M9 17h4"),
  ],
  file: [p("M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"), p("M14 3v5h5")],
  calendar: [rect(3.5, 5, 17, 15.5, 3), p("M3.5 10h17M8 3v4M16 3v4")],
  person: [circle(12, 8, 4), p("M4 21a8 8 0 0 1 16 0")],
  people: [
    circle(9, 8, 3.5),
    p("M2.5 20a6.5 6.5 0 0 1 13 0"),
    p("M16 4.5a3.5 3.5 0 0 1 0 7"),
    p("M18 14.5a6.5 6.5 0 0 1 3.5 5.5"),
  ],
  link: [
    p("M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"),
    p("M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"),
  ],
  money: [rect(3, 6, 18, 12, 3), circle(12, 12, 2.5), p("M6.5 9.5v.01M17.5 14.5v.01")],
  star: [p("m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z")],
  chevronDown: [p("m5 9 7 7 7-7")],
  chevronRight: [p("m9 5 7 7-7 7")],
  check: [p("m5 12.5 4.5 4.5L19 7.5")],
  checkSquare: [rect(4, 4, 16, 16, 4), p("m8.5 12 2.5 2.5 4.5-5")],
  clipboardCheck: [
    rect(5, 4.5, 14, 16.5, 3),
    p("M9 4.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5"),
    p("m9 13 2 2 4-4"),
  ],
  info: [circle(12, 12, 8.5), p("M12 11v5.5M12 7.8v.01")],
  /** ngoài canvas — cùng khung với `info`, dùng cho ErrorState */
  alert: [circle(12, 12, 8.5), p("M12 7.5V13M12 16.2v.01")],
  clock: [circle(12, 12, 8.5), p("M12 7.5V12l3 2")],
  video: [rect(3, 6, 12.5, 12, 3), p("m15.5 10.5 5-3v9l-5-3")],
  download: [p("M12 4v11M7 10.5l5 5 5-5"), p("M4.5 19.5h15")],
  settings: [
    circle(12, 12, 3),
    p(
      "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
    ),
  ],
  logout: [
    p("M14 4h3.5A1.5 1.5 0 0 1 19 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"),
    p("M10 16.5 5.5 12 10 7.5M5.5 12H15"),
  ],
  megaphone: [p("M4 10v4a1 1 0 0 0 1 1h2l7 4V5L7 9H5a1 1 0 0 0-1 1z"), p("M18 9a4 4 0 0 1 0 6")],
  home: [p("M3 10.5 12 3l9 7.5"), p("M5 9.5V20h5v-6h4v6h5V9.5")],
  filter: [p("M4 5h16l-6 7.5V19l-4 1.5v-8z")],
  sparkle: [
    p("M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z"),
    p("M19 15.5c.3 1.8 1 2.5 2.5 2.8-1.5.3-2.2 1-2.5 2.7-.3-1.7-1-2.4-2.5-2.7 1.5-.3 2.2-1 2.5-2.8z"),
  ],
  edit: [p("M4 20h4L19 9l-4-4L4 16z"), p("m13.5 6.5 4 4")],
  close: [p("M6 6l12 12M18 6 6 18")],
  send: [p("M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4z")],
  /** ngoài canvas */
  refresh: [p("M19.5 12a7.5 7.5 0 1 1-2.2-5.3"), p("M19.5 4.5v4h-4")],
  /** ngoài canvas — dùng cho EmptyState */
  inbox: [
    p("M3.5 13.5 6 5.5h12l2.5 8V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"),
    p("M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5"),
  ],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = SIZES.icon,
  color = COLORS.textPrimary,
  strokeWidth = 1.5,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(Platform.OS === "web" ? { "aria-hidden": true } : { accessible: false })}
    >
      {ICONS[name].map((s, i) =>
        s.t === "path" ? (
          <Path key={i} d={s.d} />
        ) : s.t === "rect" ? (
          <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} />
        ) : (
          <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} />
        )
      )}
    </Svg>
  );
}
