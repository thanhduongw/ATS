import { useMemo } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";

/**
 * Ô chọn ngày nhận / trả chuỗi "YYYY-MM-DD" (hoặc "YYYY-MM-DDTHH:mm:ss" khi `withTime`, giờ địa phương).
 *
 * Giá trị dayjs được ghi nhớ theo chuỗi. Viết `value={v ? dayjs(v) : null}` ngay trong render tạo đối tượng
 * mới mỗi lần trang render lại; khi popup lịch còn gắn (đang đóng dần) Picker coi là giá trị đổi và setState
 * liên tục → React báo "Maximum update depth exceeded" và cả trang trắng (gặp ở trang soạn thư mời).
 */
interface Props {
    value?: string | null;
    onChange: (value: string) => void;
    placeholder?: string;
    withTime?: boolean;
    /** Chặn chọn ngày đã qua. */
    futureOnly?: boolean;
}

const FULL_WIDTH = { width: "100%" };
// Chọn ngày mà chưa chọn giờ thì lấy 17:00 (cuối giờ làm việc) thay cho 00:00 — "phản hồi trước 00:00" dễ hiểu nhầm.
const TIME = { format: "HH:mm", minuteStep: 15 as const, defaultOpenValue: dayjs().hour(17).minute(0).second(0) };
const beforeToday = (d: dayjs.Dayjs) => d.isBefore(dayjs(), "day");

export default function DateField({ value, onChange, placeholder = "Chọn ngày", withTime, futureOnly }: Props) {
    const parsed = useMemo(() => (value ? dayjs(value) : null), [value]);
    return (
        <DatePicker
            style={FULL_WIDTH}
            format={withTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY"}
            showTime={withTime ? TIME : undefined}
            placeholder={placeholder}
            value={parsed}
            disabledDate={futureOnly ? beforeToday : undefined}
            onChange={(d) => onChange(d ? (withTime ? d.second(0).format("YYYY-MM-DDTHH:mm:ss") : d.format("YYYY-MM-DD")) : "")}
        />
    );
}
