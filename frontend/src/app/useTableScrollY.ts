import { useEffect, useRef, useState, type DependencyList } from "react";

/**
 * Đo chiều cao khả dụng còn lại quanh 1 bảng để truyền vào Table `scroll.y` —
 * bảng tự cuộn đúng phần thân (header cột + pagination vẫn cố định), thay vì
 * đẩy cả trang cuộn dọc. Gắn `wrapRef` vào div flex:1 bọc ngoài <Table>.
 */
export function useTableScrollY(deps: DependencyList = []) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [scrollY, setScrollY] = useState(300);

    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;

        const measure = () => {
            const header = wrap.querySelector(".ant-table-header") as HTMLElement | null;
            const pagination = wrap.querySelector(".ant-pagination") as HTMLElement | null;
            const headerH = header?.offsetHeight ?? 55;
            const paginationH = pagination ? pagination.offsetHeight + 16 : 0;
            const next = wrap.clientHeight - headerH - paginationH;
            setScrollY(Math.max(next, 160));
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(wrap);
        // Table/pagination có thể chưa render kịp ở lần đo đầu tiên (dữ liệu tải bất đồng bộ).
        const t = setTimeout(measure, 60);
        return () => {
            observer.disconnect();
            clearTimeout(t);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return { wrapRef, scrollY };
}
