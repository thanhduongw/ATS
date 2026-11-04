import dayjs from "dayjs";

/** Tạo và tải file .ics (C24 "Thêm vào lịch") — mở được bằng Google Calendar, Outlook, Lịch trên điện thoại. */
export function downloadIcs(opts: {
    uid: string;
    title: string;
    start: string;
    durationMinutes: number;
    location?: string | null;
    description?: string | null;
}) {
    const fmt = (d: dayjs.Dayjs) => d.toDate().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
    const start = dayjs(opts.start);
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//ATS//Interview//VI",
        "BEGIN:VEVENT",
        `UID:${opts.uid}@ats`,
        `DTSTAMP:${fmt(dayjs())}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(start.add(opts.durationMinutes, "minute"))}`,
        `SUMMARY:${esc(opts.title)}`,
        opts.location ? `LOCATION:${esc(opts.location)}` : null,
        opts.description ? `DESCRIPTION:${esc(opts.description)}` : null,
        "END:VEVENT",
        "END:VCALENDAR",
    ].filter(Boolean);
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "phong-van.ics";
    a.click();
    URL.revokeObjectURL(url);
}
