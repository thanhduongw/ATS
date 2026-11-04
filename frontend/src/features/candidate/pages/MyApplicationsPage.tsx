import { useState } from "react";
import { Button, Spin} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import type { CandidateApplicationResponse } from "../types";
import { COLORS } from "../../../app/theme";
import ListPage, { StatusTabs } from "../../../components/ui/listKit";
import EmptyState from "../../../components/ui/EmptyState";
import CandidateStageTag from "../components/CandidateStageTag";
import FitTable from "../../../components/ui/FitTable";
import { groupOf, todoOf, useCandidatePortal, type AppGroup } from "../useCandidatePortal";

/**
 * C11 · Đơn ứng tuyển (ứng viên): tab Tất cả · Đang xử lý · Có thư mời · Đã đóng; cột "Việc cần làm".
 * C32 trống: "Bạn chưa ứng tuyển vị trí nào" + "Tìm việc làm". C33 lỗi tải: báo lỗi + "Thử lại", không hiện số 0.
 * Rút đơn nằm ở trang chi tiết đơn (C12).
 */
type Tab = "ALL" | AppGroup;

export default function MyApplicationsPage() {
    const navigate = useNavigate();
    const { loading, failed, applications, interviews, offers, reload } = useCandidatePortal();
    const [tab, setTab] = useState<Tab>("ALL");

    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;

    if (failed) {
        return (
            <ListPage title="Đơn ứng tuyển">
                <EmptyState title="Không tải được dữ liệu" description="Kiểm tra kết nối mạng rồi thử lại."
                    action={<Button type="primary" onClick={reload}>Thử lại</Button>} />
            </ListPage>
        );
    }

    if (applications.length === 0) {
        return (
            <ListPage title="Đơn ứng tuyển">
                <EmptyState title="Bạn chưa ứng tuyển vị trí nào"
                    action={<Button type="primary" onClick={() => navigate("/careers")}>Tìm việc làm</Button>} />
            </ListPage>
        );
    }

    const count = (g: AppGroup) => applications.filter((a) => groupOf(a) === g).length;
    const rows = tab === "ALL" ? applications : applications.filter((a) => groupOf(a) === tab);

    const columns: ColumnsType<CandidateApplicationResponse> = [
        {
            title: "Vị trí", key: "job",
            render: (_, a) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>{a.jobTitle ?? `Đơn #${a.id}`}</span>
                    <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {[a.departmentName, `Nộp ${dayjs(a.appliedAt).format("DD/MM/YYYY")}`].filter(Boolean).join(" · ")}
                    </span>
                </div>
            ),
        },
        { title: "Giai đoạn", key: "stage", width: 150, render: (_, a) => <CandidateStageTag app={a} /> },
        {
            title: "Việc cần làm", key: "todo", width: 340,
            render: (_, a) => {
                const t = todoOf(a, interviews, offers);
                return (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ fontSize: 13, color: t ? COLORS.textPrimary : COLORS.textMuted }}>{t?.text ?? "—"}</span>
                        <Button
                            size="small"
                            type={t ? "primary" : "default"}
                            onClick={(e) => { e.stopPropagation(); navigate(t?.to ?? `/my-applications/${a.id}`); }}
                        >
                            {t?.actionLabel ?? "Chi tiết"}
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <ListPage
            title="Đơn ứng tuyển"
            tabs={
                <StatusTabs<Tab>
                    active={tab}
                    onChange={setTab}
                    items={[
                        { key: "ALL", label: "Tất cả", count: applications.length },
                        { key: "ACTIVE", label: "Đang xử lý", count: count("ACTIVE") },
                        { key: "OFFER", label: "Có thư mời", count: count("OFFER") },
                        { key: "CLOSED", label: "Đã đóng", count: count("CLOSED") },
                    ]}
                />
            }
        >
            <FitTable<CandidateApplicationResponse>
                rowKey="id"
                columns={columns}
                dataSource={rows}
                rowClassName={() => "row-clickable"}
                onRow={(a) => ({ onClick: () => navigate(`/my-applications/${a.id}`) })}
                locale={{ emptyText: "Không có đơn nào trong mục này" }}
            />
        </ListPage>
    );
}
