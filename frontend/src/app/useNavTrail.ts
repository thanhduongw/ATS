import { useLocation, useNavigate } from "react-router-dom";
import { moduleKeyFor, trailFor, type Crumb } from "./navigation";

/**
 * Vết đường đi mang theo mỗi lần chuyển trang.
 *
 * Cùng một hồ sơ ứng viên có thể mở từ danh sách hồ sơ, từ tin tuyển dụng hay từ
 * bảng theo dõi đánh giá. Cây route chỉ biết một đường cha duy nhất, nên lối đi
 * thực tế phải do trang gốc gửi kèm.
 */
export interface NavOrigin {
    trail: Crumb[];
    /** Module của trang gốc, để sidebar và breadcrumb không chỉ về hai nơi khác nhau. */
    moduleKey?: string;
}

function originOf(state: unknown): NavOrigin | undefined {
    const origin = (state as { origin?: NavOrigin } | null)?.origin;
    return origin && Array.isArray(origin.trail) && origin.trail.length > 0 ? origin : undefined;
}

/**
 * Breadcrumb của trang hiện tại: ưu tiên lối người dùng thực sự đi, không có thì
 * dựng lại theo cây route (trường hợp mở thẳng bằng URL hoặc tải lại trang).
 */
export function usePageTrail(currentLabel?: string | null): Crumb[] {
    const location = useLocation();
    const origin = originOf(location.state);
    const own = trailFor(location.pathname, currentLabel);

    if (!origin) return own;
    const current = own[own.length - 1] ?? { label: currentLabel ?? "" };
    return [...origin.trail, current];
}

/** Key mục sidebar cần sáng cho trang đang xem. */
export function useActiveModuleKey(): string | undefined {
    const location = useLocation();
    return originOf(location.state)?.moduleKey ?? moduleKeyFor(location.pathname);
}

/**
 * Điều hướng xuống trang con, mang theo ngữ cảnh của trang hiện tại.
 *
 * `currentLabel` là nhãn trang này sẽ hiện trên breadcrumb của trang con — truyền
 * tên thật của bản ghi nếu có.
 */
export function useTrailNavigate(currentLabel?: string | null) {
    const navigate = useNavigate();
    const location = useLocation();
    const trail = usePageTrail(currentLabel);
    const moduleKey = useActiveModuleKey();

    return (to: string, options?: { replace?: boolean }) => {
        // Bậc hiện tại trở thành bậc bấm được của trang con, kèm query để quay lại
        // đúng bộ lọc và đúng trang mà người dùng đang xem dở.
        const here = `${location.pathname}${location.search}`;
        const origin: NavOrigin = {
            trail: trail.map((crumb, index) =>
                index === trail.length - 1 ? { ...crumb, to: here } : crumb),
            moduleKey,
        };
        navigate(to, { state: { origin }, replace: options?.replace });
    };
}

/**
 * Điều hướng ngược lên một bậc trên breadcrumb, giữ lại phần đường đi phía trên
 * để bậc đó vẫn biết nó đến từ đâu.
 */
export function useCrumbNavigate() {
    const navigate = useNavigate();

    return (trail: Crumb[], index: number) => {
        const target = trail[index];
        if (!target?.to) return;

        const upstream = trail.slice(0, index);
        if (upstream.length === 0) {
            navigate(target.to);
            return;
        }
        navigate(target.to, {
            state: { origin: { trail: upstream, moduleKey: moduleKeyFor(target.to) } },
        });
    };
}
