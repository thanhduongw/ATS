import { useRef, useState } from "react";
import { Table, type TableProps } from "antd";
import { useFitPageSize } from "./useFitPageSize";

/**
 * Bảng danh sách phân trang ở client, số dòng/trang vừa khít màn hình (xem `useFitPageSize`).
 * Dùng thay `<Table>` trong các màn danh sách; `pagination` do bảng tự quản lý (bỏ qua prop truyền vào).
 * Hết dữ liệu trong 1 trang thì không hiện thanh phân trang.
 */
export default function FitTable<T extends object>({ dataSource, pagination: _ignored, fitScope, ...rest }: TableProps<T> & {
    /** Xem `FitOptions.scope` — dùng khi bảng nằm trong một cột của trang chia cột. */
    fitScope?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [page, setPage] = useState(1);
    const total = dataSource?.length ?? 0;
    const pageSize = useFitPageSize(ref, {
        itemSelector: ".ant-table-tbody > tr.ant-table-row",
        headerSelector: ".ant-table-thead",
        fallbackItem: 57,
        deps: [total, page],
        scope: fitScope,
    });
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, pages);

    return (
        <div ref={ref}>
            <Table<T>
                {...rest}
                dataSource={dataSource}
                pagination={total > pageSize ? {
                    current, pageSize, onChange: setPage, showSizeChanger: false,
                    showTotal: (t, [from, to]) => `${from}–${to} / ${t}`,
                } : false}
            />
        </div>
    );
}
