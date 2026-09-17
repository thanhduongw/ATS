/**
 * Cây điều hướng của toàn hệ thống.
 *
 * Một nơi khai báo duy nhất trả lời hai câu hỏi khác nhau:
 *  - Sidebar: "trang này thuộc module nào?"            → moduleKeyFor()
 *  - Breadcrumb: "trang này ở đâu trong module đó?"    → trailFor()
 *
 * Nhờ vậy trang chi tiết không phải tự đoán đường dẫn cha, và sidebar không còn
 * tắt đèn chỉ vì URL hiện tại không trùng URL của trang danh sách.
 */

export interface Crumb {
    label: string;
    /** Không có `to` nghĩa là bậc hiện tại: hiện ra nhưng không bấm được. */
    to?: string;
}

interface RouteNode {
    /** Mẫu đường dẫn; đoạn bắt đầu bằng ":" là tham số. */
    pattern: string;
    label: string;
    /** Mẫu đường dẫn của route cha. Không khai báo tức là bậc gốc của module. */
    parent?: string;
    /**
     * Key mục sidebar cần sáng khi đang ở route này. Các bậc con thừa hưởng từ
     * cha nên chỉ cần khai báo ở bậc gốc.
     */
    moduleKey?: string;
}

const ROUTES: RouteNode[] = [
    { pattern: "/dashboard", label: "Tổng quan", moduleKey: "/dashboard" },
    { pattern: "/masterdata", label: "Danh mục", moduleKey: "/masterdata" },

    // ── Tuyển dụng ────────────────────────────────────────────────────────
    { pattern: "/recruitment", label: "Tuyển dụng", moduleKey: "/recruitment/requisitions" },
    { pattern: "/recruitment/requisitions", label: "Yêu cầu tuyển dụng", moduleKey: "/recruitment/requisitions" },
    { pattern: "/recruitment/postings", label: "Tin tuyển dụng", moduleKey: "/recruitment/postings" },
    { pattern: "/recruitment/postings/:id", label: "Chi tiết tin tuyển dụng", parent: "/recruitment/postings" },

    // ── Hồ sơ ứng viên ────────────────────────────────────────────────────
    { pattern: "/applications", label: "Hồ sơ ứng viên", moduleKey: "/applications" },
    {
        pattern: "/candidates/:candidateId/applications/:applicationId",
        label: "Chi tiết hồ sơ",
        parent: "/applications",
    },
    {
        pattern: "/candidates/:candidateId/applications/:applicationId/evaluate",
        label: "Phiếu đánh giá",
        parent: "/candidates/:candidateId/applications/:applicationId",
    },

    // ── Phỏng vấn ─────────────────────────────────────────────────────────
    { pattern: "/interviews", label: "Lịch phỏng vấn", moduleKey: "/interviews" },
    { pattern: "/interviews/:interviewId/result", label: "Kết quả phỏng vấn", parent: "/interviews" },
    // Đánh giá không còn mục riêng trên navbar nên mượn module Lịch phỏng vấn.
    { pattern: "/evaluations", label: "Đánh giá phỏng vấn", parent: "/interviews" },

    // ── Đề nghị nhận việc ─────────────────────────────────────────────────
    { pattern: "/offers", label: "Đề nghị nhận việc", moduleKey: "/offers" },
    { pattern: "/offers/compare", label: "So sánh ứng viên", parent: "/offers" },
    { pattern: "/offers/create", label: "Tạo đề nghị", parent: "/offers" },
    { pattern: "/offers/:id", label: "Chi tiết đề nghị", parent: "/offers" },
    { pattern: "/offers/:id/edit", label: "Chỉnh sửa", parent: "/offers/:id" },

    // ── Quản trị ──────────────────────────────────────────────────────────
    { pattern: "/admin/users", label: "Người dùng", moduleKey: "/admin/users" },
    { pattern: "/audit-logs", label: "Nhật ký hệ thống", moduleKey: "/audit-logs" },
    { pattern: "/notifications", label: "Thông báo", moduleKey: "/notifications" },
    { pattern: "/settings", label: "Cài đặt tài khoản", moduleKey: "/settings" },

    // ── Khu vực ứng viên ──────────────────────────────────────────────────
    { pattern: "/my-profile", label: "Hồ sơ của tôi", moduleKey: "/my-profile" },
    { pattern: "/jobs", label: "Việc làm", moduleKey: "/jobs" },
    { pattern: "/my-applications", label: "Đơn ứng tuyển của tôi", moduleKey: "/my-applications" },
    { pattern: "/my-interviews", label: "Lịch phỏng vấn", moduleKey: "/my-interviews" },
    { pattern: "/my-offers", label: "Thư mời nhận việc", moduleKey: "/my-offers" },
    { pattern: "/my-offers/:id", label: "Chi tiết thư mời", parent: "/my-offers" },
];

const segmentsOf = (path: string) => path.split("/").filter(Boolean);

const nodeOf = (pattern: string | undefined) =>
    pattern ? ROUTES.find((route) => route.pattern === pattern) : undefined;

interface RouteMatch {
    node: RouteNode;
    params: Record<string, string>;
}

/**
 * Tìm route khớp với đường dẫn đang xem.
 *
 * Đoạn tĩnh khớp được tính điểm nên `/offers/create` luôn thắng `/offers/:id`
 * dù cả hai cùng số đoạn.
 */
export function matchRoute(pathname: string): RouteMatch | undefined {
    const parts = segmentsOf(pathname);
    let best: RouteMatch | undefined;
    let bestScore = -1;

    for (const node of ROUTES) {
        const pattern = segmentsOf(node.pattern);
        if (pattern.length !== parts.length) continue;

        const params: Record<string, string> = {};
        let score = 0;
        let matched = true;

        for (let i = 0; i < pattern.length; i += 1) {
            if (pattern[i].startsWith(":")) {
                params[pattern[i].slice(1)] = parts[i];
                continue;
            }
            if (pattern[i] !== parts[i]) {
                matched = false;
                break;
            }
            score += 1;
        }

        if (matched && score > bestScore) {
            best = { node, params };
            bestScore = score;
        }
    }

    return best;
}

/** Dựng lại đường dẫn thật của một mẫu, lấy tham số từ URL đang xem. */
function fillPattern(pattern: string, params: Record<string, string>): string {
    return `/${segmentsOf(pattern)
        .map((part) => (part.startsWith(":") ? params[part.slice(1)] ?? part : part))
        .join("/")}`;
}

/** Key mục sidebar cần sáng cho một đường dẫn bất kỳ, kể cả trang chi tiết nhiều cấp. */
export function moduleKeyFor(pathname: string): string | undefined {
    let node = matchRoute(pathname)?.node;
    while (node) {
        if (node.moduleKey) return node.moduleKey;
        node = nodeOf(node.parent);
    }
    return undefined;
}

/**
 * Breadcrumb mặc định của một đường dẫn, dựng theo chuỗi cha trong cây route.
 *
 * `currentLabel` để trang truyền tên thật của bản ghi (tên ứng viên, tiêu đề tin
 * tuyển dụng) thay cho nhãn tĩnh.
 */
export function trailFor(pathname: string, currentLabel?: string | null): Crumb[] {
    const match = matchRoute(pathname);
    if (!match) return currentLabel ? [{ label: currentLabel }] : [];

    const chain: RouteNode[] = [];
    let node: RouteNode | undefined = match.node;
    while (node) {
        chain.unshift(node);
        node = nodeOf(node.parent);
    }

    return chain.map((entry, index) =>
        index === chain.length - 1
            ? { label: currentLabel || entry.label }
            : { label: entry.label, to: fillPattern(entry.pattern, match.params) },
    );
}
