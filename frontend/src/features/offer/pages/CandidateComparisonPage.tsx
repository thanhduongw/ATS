import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { App, Card, Select, Space, Spin } from "antd";
import { TrophyOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import CandidateComparisonPanel from "../components/CandidateComparisonPanel";
import type { ApiMessageResponse } from "../types";
import { getPostings } from "../../recruitment/recruitmentApi";
import type { JobPostingResponse } from "../../recruitment/types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { COLORS } from "../../../app/theme";
import EmptyState from "../../../components/ui/EmptyState";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";
import { listCardStyle, listCardBodyStyle } from "../../../components/ui/listStyles";

/** Tin đã đóng không còn tuyển nên không đưa vào danh sách chọn để so sánh. */
const COMPARABLE_STATUSES = ["OPEN", "PAUSED"];

/**
 * So sanh ung vien theo tin tuyen dung. Di theo dung thu tu thuc te:
 * phong ban -> tin tuyen dung cua phong ban do -> bang so sanh.
 */
export default function CandidateComparisonPage() {
    const { message } = App.useApp();
    const [searchParams, setSearchParams] = useSearchParams();
    const postingIdParam = searchParams.get("postingId");

    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [departmentId, setDepartmentId] = useState<number | null>(null);
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [loadingDepartments, setLoadingDepartments] = useState(true);
    const [loadingPostings, setLoadingPostings] = useState(false);

    const selectedId = postingIdParam ? Number(postingIdParam) : null;

    useEffect(() => {
        getCatalogItems("/masterdata/departments")
            .then((r) => setDepartments(r.data))
            .catch((err) => {
                const axiosErr = err as AxiosError<ApiMessageResponse>;
                message.error(axiosErr.response?.data?.message ?? "Không tải được danh sách phòng ban");
            })
            .finally(() => setLoadingDepartments(false));
    }, [message]);

    /** Đổi phòng ban thì bỏ luôn tin đang chọn, không để sót lựa chọn của phòng ban cũ. */
    const pickDepartment = useCallback(async (value: number | null) => {
        setDepartmentId(value);
        setPostings([]);
        setSearchParams({});
        if (value == null) return;

        setLoadingPostings(true);
        try {
            // API tin tuyển dụng chưa lọc theo phòng ban nên lọc ở đây.
            const res = await getPostings({ size: 1000 });
            setPostings(res.data.content.filter(
                (p) => p.departmentId === value && COMPARABLE_STATUSES.includes(p.status),
            ));
        } catch (err) {
            setPostings([]);
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được danh sách tin tuyển dụng");
        } finally {
            setLoadingPostings(false);
        }
    }, [message, setSearchParams]);

    const postingOptions = useMemo(
        () => postings.map((p) => ({
            value: p.id,
            label: p.headcount ? `${p.title} — tuyển ${p.headcount} người` : p.title,
        })),
        [postings],
    );

    return (
        <div className="page-shell animate-fade-in">
            <PageBreadcrumb className="page-shell-fixed" />
            <Card
                className="table-card-fill"
                style={listCardStyle}
                styles={{ body: listCardBodyStyle }}
            >
                <div style={{ marginBottom: 14, flexShrink: 0 }}>
                    <Space wrap align="center">
                        <span style={{ fontWeight: 600, fontSize: 15 }}>
                            <TrophyOutlined style={{ marginRight: 8, color: COLORS.textMuted }} />
                            So sánh ứng viên
                        </span>

                        <Select
                            style={{ minWidth: 220 }}
                            placeholder="1. Chọn phòng ban"
                            showSearch
                            allowClear
                            optionFilterProp="label"
                            value={departmentId ?? undefined}
                            onChange={(v) => pickDepartment(v ?? null)}
                            loading={loadingDepartments}
                            options={departments.map((d) => ({ value: d.id, label: String(d.name) }))}
                        />

                        <Select
                            style={{ minWidth: 320 }}
                            placeholder={departmentId == null ? "Chọn phòng ban trước" : "2. Chọn tin tuyển dụng"}
                            showSearch
                            optionFilterProp="label"
                            disabled={departmentId == null}
                            loading={loadingPostings}
                            value={selectedId ?? undefined}
                            onChange={(v) => setSearchParams({ postingId: String(v) })}
                            notFoundContent="Phòng ban này chưa có tin tuyển dụng đang mở"
                            options={postingOptions}
                        />
                    </Space>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6 }}>
                        Bảng chỉ so sánh ứng viên trong cùng một tin tuyển dụng, dựa trên đánh giá
                        phỏng vấn đã nộp của hiring manager.
                    </div>
                </div>

                {loadingDepartments ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
                        <Spin />
                    </div>
                ) : selectedId ? (
                    <CandidateComparisonPanel jobPostingId={selectedId} showHeader={false} />
                ) : (
                    <EmptyState
                        title={departmentId == null ? "Chọn phòng ban" : "Chọn tin tuyển dụng"}
                        description={departmentId == null
                            ? "Chọn phòng ban trước để xem các tin tuyển dụng đang mở của phòng ban đó."
                            : "Ứng viên chỉ được so sánh trong phạm vi cùng một tin tuyển dụng."}
                    />
                )}
            </Card>
        </div>
    );
}
