import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Skeleton, Empty } from "antd";
import {
    FileSearchOutlined, FormOutlined, RightOutlined, SolutionOutlined, AuditOutlined,
    CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getApplications } from "../../candidate/applicationApi";
import { getInterviews } from "../../interview/interviewApi";
import { getOffers } from "../../offer/offerApi";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import { COLORS, RADIUS } from "../../../app/theme";

interface QueueItem {
    key: string;
    icon: React.ReactNode;
    label: string;
    count: number;
    accent: string;
    to: string;
}

/**
 * Hang doi viec can xu ly. Muc dich la tra loi "hom nay toi phai lam gi" ngay khi dang nhap,
 * thay vi bat nguoi dung tu loc tung bang de tim ra viec cua minh.
 *
 * Backend da tu gioi han pham vi theo phong ban cho HIRING_MANAGER, nen cung mot loat goi API
 * se ra so lieu cua phong ban do chu khong phai toan cong ty.
 */
export default function WorkQueueCard() {
    const navigate = useNavigate();
    const user = useAppSelector((s) => s.auth.user);
    const role = user?.role as UserRole | undefined;
    const isHr = !!role && HR_ROLES.includes(role);

    const [items, setItems] = useState<QueueItem[] | null>(null);

    const load = useCallback(async () => {
        try {
            if (isHr) {
                const [newCv, atOffer, interviewRes, pendingOffers] = await Promise.all([
                    getApplications({ stageType: "APPLIED", size: 1 }),
                    getApplications({ stageType: "OFFER", size: 1 }),
                    getInterviews(),
                    getOffers({ status: "PENDING_APPROVAL", size: 1 }),
                ]);

                const waitingEvaluation = interviewRes.data.filter(
                    (iv) => iv.status !== "CANCELLED"
                        && iv.interviewers.length > 0
                        && iv.interviewers.some((i) => !i.evaluationSubmitted),
                ).length;

                setItems([
                    {
                        key: "new-cv",
                        icon: <FileSearchOutlined />,
                        label: "CV mới cần xem",
                        count: newCv.data.totalItems,
                        accent: "#3B82F6",
                        to: "/applications?stageType=APPLIED",
                    },
                    {
                        key: "waiting-eval",
                        icon: <FormOutlined />,
                        label: "Buổi phỏng vấn chờ đánh giá",
                        count: waitingEvaluation,
                        accent: "#F59E0B",
                        to: "/evaluations",
                    },
                    {
                        key: "at-offer",
                        icon: <SolutionOutlined />,
                        label: "Ứng viên đang ở vòng Đề nghị",
                        count: atOffer.data.totalItems,
                        accent: "#8B5CF6",
                        to: "/applications?stageType=OFFER",
                    },
                    {
                        key: "pending-offer",
                        icon: <AuditOutlined />,
                        label: "Đề nghị chờ duyệt",
                        count: pendingOffers.data.totalItems,
                        accent: COLORS.success,
                        to: "/offers",
                    },
                ]);
                return;
            }

            // Quan ly phong ban: chi quan tam viec cua chinh minh.
            const interviewRes = await getInterviews();
            const mine = interviewRes.data.filter(
                (iv) => iv.status !== "CANCELLED"
                    && iv.interviewers.some((i) => String(i.interviewerId) === user?.userId),
            );
            const pendingMine = mine.filter(
                (iv) => iv.interviewers.some(
                    (i) => String(i.interviewerId) === user?.userId && !i.evaluationSubmitted,
                ),
            ).length;
            const upcoming = mine.filter((iv) => dayjs(iv.scheduledAt).isAfter(dayjs())).length;

            setItems([
                {
                    key: "my-eval",
                    icon: <FormOutlined />,
                    label: "Đánh giá tôi cần nộp",
                    count: pendingMine,
                    accent: "#F59E0B",
                    to: "/evaluations",
                },
                {
                    key: "upcoming",
                    icon: <CalendarOutlined />,
                    label: "Buổi phỏng vấn sắp tới",
                    count: upcoming,
                    accent: "#3B82F6",
                    to: "/interviews",
                },
            ]);
        } catch {
            // Hang doi hong khong duoc lam hong ca trang tong quan.
            setItems([]);
        }
    }, [isHr, user?.userId]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <Card
            title="Việc cần xử lý"
            style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: RADIUS.lg, marginBottom: 16 }}
            styles={{ body: { padding: 12 } }}
        >
            {items == null ? (
                <Skeleton active paragraph={{ rows: 2 }} />
            ) : items.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa đọc được dữ liệu công việc" />
            ) : (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
                    gap: 10,
                }}>
                    {items.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => navigate(item.to)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "12px 14px",
                                border: `1px solid ${item.count > 0 ? item.accent : COLORS.borderLight}`,
                                borderRadius: RADIUS.md,
                                background: item.count > 0 ? `${item.accent}0D` : "#fff",
                                cursor: "pointer",
                                textAlign: "left",
                                font: "inherit",
                            }}
                        >
                            <span style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                background: `${item.accent}1A`, color: item.accent, fontSize: 16,
                            }}>
                                {item.icon}
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{
                                    display: "block", fontSize: 20, fontWeight: 700,
                                    color: item.count > 0 ? COLORS.textPrimary : COLORS.textMuted,
                                    lineHeight: 1.2,
                                }}>
                                    {item.count}
                                </span>
                                <span style={{ display: "block", fontSize: 13, color: COLORS.textSecondary }}>
                                    {item.label}
                                </span>
                            </span>
                            <RightOutlined style={{ color: COLORS.textMuted, fontSize: 12 }} />
                        </button>
                    ))}
                </div>
            )}
        </Card>
    );
}
