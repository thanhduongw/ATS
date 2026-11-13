import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";

/**
 * Số dòng vừa khít một màn hình (quyết định 04/11/2026: bảng dài phân trang vừa 1 màn, đúng ở MỌI cỡ màn).
 *
 * Cách tính: khoảng trống = đáy vùng cuộn chính (Content của AppLayout, trừ đệm dưới) − đỉnh danh sách
 * − tiêu đề bảng − chỗ cho thanh phân trang. Số dòng = khoảng trống ÷ chiều cao một dòng (trung vị các dòng
 * đang hiện, chưa có dòng thì dùng `fallbackItem`). Tính lại khi đổi cỡ cửa sổ / vùng cuộn và khi `deps` đổi.
 */
export interface FitOptions {
    /** Bộ chọn CSS của một dòng trong `ref` (vd. ".ant-table-tbody > tr.ant-table-row"). */
    itemSelector: string;
    /** Chiều cao dòng khi chưa đo được. */
    fallbackItem: number;
    /** Bộ chọn tiêu đề bảng (nếu có) để trừ chiều cao. */
    headerSelector?: string;
    /** Chỗ dành cho thanh phân trang và khoảng cách bên dưới. */
    reserve?: number;
    /** Ít nhất bao nhiêu dòng (mặc định 1 — màn nhỏ / bảng bị bóp hẹp vẫn không phải cuộn). */
    min?: number;
    /** Đổi dữ liệu / bộ lọc → đo lại. */
    deps?: unknown[];
    /**
     * Bộ chọn CSS của khung chứa bảng khi trang chia cột (vd. A01: bảng bên trái, phễu bên phải). Có thì chỉ
     * đo tới đáy khung này — cột bên cạnh cao hơn không làm bảng co lại.
     */
    scope?: string;
}

const PAGINATION_RESERVE = 72;

function scrollParent(el: HTMLElement | null): HTMLElement | null {
    let p = el?.parentElement ?? null;
    while (p) {
        const oy = getComputedStyle(p).overflowY;
        if ((oy === "auto" || oy === "scroll") && p.clientHeight > 0) return p;
        p = p.parentElement;
    }
    return null;
}

const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
};

export function useFitPageSize(ref: RefObject<HTMLElement | null>, opts: FitOptions): number {
    const { itemSelector, fallbackItem, headerSelector, reserve = PAGINATION_RESERVE, min = 1, deps = [], scope } = opts;
    const [size, setSize] = useState(10);

    const measure = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const scroller = scrollParent(el);
        const limit = scroller
            ? scroller.getBoundingClientRect().bottom - parseFloat(getComputedStyle(scroller).paddingBottom || "0")
            : window.innerHeight;
        // Vị trí khi vùng cuộn ở đầu trang (đỉnh hiện tại + phần đã cuộn).
        const top = el.getBoundingClientRect().top + (scroller ? scroller.scrollTop : window.scrollY);
        const header = headerSelector ? (el.querySelector<HTMLElement>(headerSelector)?.offsetHeight ?? 0) : 0;
        const heights = [...el.querySelectorAll<HTMLElement>(itemSelector)].map((r) => r.offsetHeight).filter((h) => h > 0);
        const item = heights.length ? median(heights) : fallbackItem;
        // Khoảng trống THẬT còn lại ở đáy trang: đo tới đáy của TOÀN BỘ nội dung trong vùng cuộn (kể cả phần
        // nằm dưới danh sách như ghi chú, thanh phân trang), không chỉ đáy danh sách.
        const scrollTop = scroller ? scroller.scrollTop : window.scrollY;
        const scopeEl = scope ? el.closest<HTMLElement>(scope) : null;
        const kids = scopeEl ? [scopeEl] : scroller ? [...scroller.children] : [document.body];
        const contentBottom = Math.max(el.getBoundingClientRect().bottom, ...kids.map((k) => k.getBoundingClientRect().bottom)) + scrollTop;
        const spare = limit - contentBottom;
        setSize((cur) => {
            const rendered = heights.length;
            let next: number;
            if (!rendered) {
                // Chưa có dòng nào: ước lượng theo công thức (chừa chỗ thanh phân trang).
                next = Math.floor((limit - top - header - reserve) / item);
            } else if (rendered >= cur) {
                // Trang đầy: thêm dòng nếu còn chỗ, bớt nếu tràn.
                next = rendered + Math.floor(spare / item);
            } else {
                // Trang cuối / ít dữ liệu: chỉ bớt khi tràn (không có dòng để thêm).
                next = spare < 0 ? cur + Math.floor(spare / item) : cur;
            }
            next = Math.max(min, next);
            return next === cur ? cur : next;
        });
    }, [ref, itemSelector, fallbackItem, headerSelector, reserve, min, scope]);

    // Đo sau mỗi lần vẽ lại do dữ liệu / số dòng đổi — tự hiệu chỉnh tới khi vừa khít.
    useLayoutEffect(measure, [measure, size, ...deps]);

    useEffect(() => {
        const scroller = scrollParent(ref.current);
        const ro = new ResizeObserver(() => measure());
        if (scroller) ro.observe(scroller);
        window.addEventListener("resize", measure);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [ref, measure]);

    return size;
}

/**
 * Chia danh sách có tiêu đề nhóm (vd. nhóm theo ngày) thành các trang vừa `size` dòng: mỗi tiêu đề nhóm
 * chiếm khoảng `headerRatio` một dòng. Trả về [đầu, cuối) của từng trang — trang nào cũng ít nhất 1 mục.
 */
export function paginateGrouped<T>(list: T[], size: number, groupOf: (item: T) => string, headerRatio = 0.6): [number, number][] {
    const pages: [number, number][] = [];
    let i = 0;
    while (i < list.length) {
        let n = Math.min(size, list.length - i);
        const cost = (k: number) => k + new Set(list.slice(i, i + k).map(groupOf)).size * headerRatio;
        while (n > 1 && cost(n) > size) n -= 1;
        pages.push([i, i + n]);
        i += n;
    }
    return pages;
}
