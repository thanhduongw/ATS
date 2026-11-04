import { useCallback, useEffect, useState } from "react";
import { Button, Spin } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { getRequisitionById } from "../recruitmentApi";
import type { JobRequisitionResponse } from "../types";
import RequisitionDetailModal from "../components/RequisitionDetailModal";
import RequisitionHmView from "../components/RequisitionHmView";
import { useAppSelector } from "../../../app/hooks";
import { useRecruitmentCatalogs } from "../useRecruitmentCatalogs";
import { InlineNotice } from "../../../components/ui/designKit";

/**
 * R03 / H06 / H07 · Chi tiết yêu cầu tuyển dụng — trang riêng (DS06: không dùng ngăn kéo/modal
 * cho nội dung dài). Dùng lại toàn bộ thao tác Duyệt / Yêu cầu sửa / Từ chối của RequisitionDetailModal.
 */
export default function RequisitionDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const cat = useRecruitmentCatalogs();
    const isHm = useAppSelector((s) => s.auth.user?.role) === "HIRING_MANAGER";
    const [item, setItem] = useState<JobRequisitionResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const load = useCallback(async () => {
        try {
            const r = await getRequisitionById(Number(id));
            setItem(r.data);
            setFailed(false);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { void load(); }, [load]);

    if (loading) return <div style={{ padding: 60, textAlign: "center" }}><Spin /></div>;
    if (failed || !item) {
        return (
            <InlineNotice tone="danger" action={<Button onClick={() => navigate("/recruitment/requisitions")}>Về danh sách</Button>}>
                Không tải được yêu cầu tuyển dụng này.
            </InlineNotice>
        );
    }

    if (isHm) return <RequisitionHmView requisition={item} cat={cat} />;

    return (
            <RequisitionDetailModal
                asPage
                open
                requisition={item}
                {...cat}
                onClose={() => void load()}
                onChanged={() => void load()}
                onEdit={(r) => navigate(`/recruitment/requisitions/${r.id}/edit`)}
            />
    );
}
