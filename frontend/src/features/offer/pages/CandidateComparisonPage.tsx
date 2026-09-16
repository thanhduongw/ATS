import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { App, Card, Select, Space, Spin } from "antd";
import { TrophyOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import CandidateComparisonPanel from "../components/CandidateComparisonPanel";
import type { ApiMessageResponse } from "../types";
import { getPostings } from "../../recruitment/recruitmentApi";
import type { JobPostingResponse } from "../../recruitment/types";
import { COLORS } from "../../../app/theme";
import EmptyState from "../../../components/ui/EmptyState";
import { listCardStyle, listCardBodyStyle } from "../../../components/ui/listStyles";

/** Tin đã đóng không còn tuyển nên không đưa vào danh sách chọn để so sánh. */
const COMPARABLE_STATUSES = ["OPEN", "PAUSED"];

/**
 * So sánh ứng viên theo tin tuyển dụng, vào từ menu Offer. Cùng một bảng với tab "So sánh"
 * trong Posting Hub — ở đây HR tự chọn tin thay vì đi từ chi tiết tin.
 */
export default function CandidateComparisonPage() {
    const { message } = App.useApp();
    const [searchParams, setSearchParams] = useSearchParams();
    const postingIdParam = searchParams.get("postingId");

    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const selectedId = postingIdParam ? Number(postingIdParam) : null;

    useEffect(() => {
        getPostings({ size: 1000 })
            .then((r) => setPostings(r.data.content.filter((p) => COMPARABLE_STATUSES.includes(p.status))))
            .catch((err) => {
                const axiosErr = err as AxiosError<ApiMessageResponse>;
                message.error(axiosErr.response?.data?.message ?? "Không tải được danh sách tin tuyển dụng");
            })
            .finally(() => setLoading(false));
    }, [message]);

    const options = useMemo(
        () => postings.map((p) => ({
            value: p.id,
            label: p.headcount ? `${p.title} — tuyển ${p.headcount} người` : p.title,
        })),
        [postings],
    );

    return (
        <div className="page-shell animate-fade-in">
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
                            style={{ minWidth: 320 }}
                            placeholder="Chọn tin tuyển dụng để so sánh"
                            showSearch
                            optionFilterProp="label"
                            value={selectedId ?? undefined}
                            onChange={(v) => setSearchParams({ postingId: String(v) })}
                            options={options}
                            loading={loading}
                        />
                    </Space>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6 }}>
                        Bảng chỉ so sánh ứng viên trong cùng một tin tuyển dụng, dựa trên đánh giá
                        phỏng vấn đã nộp của hiring manager.
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
                        <Spin />
                    </div>
                ) : selectedId ? (
                    <CandidateComparisonPanel jobPostingId={selectedId} showHeader={false} />
                ) : (
                    <EmptyState
                        title="Chọn một tin tuyển dụng"
                        description="Ứng viên chỉ được so sánh trong phạm vi cùng một tin tuyển dụng."
                    />
                )}
            </Card>
        </div>
    );
}
