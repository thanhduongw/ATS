import { useCallback, useEffect, useState, useMemo, type Key } from "react";
import { App, Card, Table, Button, Input, Select, Tooltip, Avatar, Modal, Form, Tag } from "antd";
import {
    PlusOutlined, SearchOutlined, UserOutlined, DownloadOutlined,
    UserAddOutlined, FileSearchOutlined, CalendarOutlined, TrophyOutlined, MailOutlined, CloseCircleOutlined,
    RobotOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import type { ColumnsType } from "antd/es/table";
import { getCandidates } from "../candidateApi";
import { getApplications, bulkAdvanceApplicationStage, bulkRejectApplications } from "../applicationApi";
import { getCatalogItems, getPipelines } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { getPostings } from "../../recruitment/recruitmentApi";
import type { ApiMessageResponse, CandidateResponse, ApplicationResponse, CandidateWithApplications, BulkOperationResponse } from "../types";
import CandidateFormModal from "../components/CandidateFormModal";
import AiCvUploadModal from "../../ai/components/AiCvUploadModal";
import AiScoreBadge from "../../../components/AiScoreBadge";
import type { CandidateFormValues } from "../schemas/candidateSchema";
import { COLORS, GRADIENTS } from "../../../app/theme";
import { exportToExcel } from "../../../app/exportExcel";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import { useTableScrollY } from "../../../app/useTableScrollY";
import EmptyState from "../../../components/ui/EmptyState";
import StatTile from "../../../components/ui/StatTile";
import { StatRow, FilterBar } from "../../../components/ui/pageKit";
import { listCardStyle, listCardBodyStyle, listPagination } from "../../../components/ui/listStyles";
import { stageTypeTagColor } from "../../../app/statusLabels";

const INTERVIEW_STAGE_TYPES = ["TECHNICAL_INTERVIEW", "HR_INTERVIEW", "FINAL_INTERVIEW"];

/** Lọc nhanh bằng cách bấm vào ô số liệu đầu trang. */
type QuickFilter = "new7d" | "cvScreening" | "interview" | "hired" | null;

const DEPARTMENT_DOT_COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EC4899", "#06B6D4"];
function departmentDotColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return DEPARTMENT_DOT_COLORS[hash % DEPARTMENT_DOT_COLORS.length];
}

/** Chưa có dữ liệu AI thật (tính năng đang phát triển) — giữ chỗ để bật sort ngay khi có điểm thật. */
function getAiScore(_record: CandidateWithApplications): number | undefined {
    return undefined;
}

export default function CandidatesPage() {
    const { notification, message, modal } = App.useApp();
    const navigate = useNavigate();
    const role = useAppSelector((s) => s.auth.user?.role);
    const isHr = !!role && HR_ROLES.includes(role);
    const [candidates, setCandidates] = useState<CandidateResponse[]>([]);
    const [totalCandidates, setTotalCandidates] = useState(0);
    const [allApplications, setAllApplications] = useState<ApplicationResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
    const [positionFilter, setPositionFilter] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiPrefilledData, setAiPrefilledData] = useState<Partial<CandidateFormValues> | null>(null);
    const [aiPrefilledFile, setAiPrefilledFile] = useState<File | null>(null);

    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
    const [rejectReasons, setRejectReasons] = useState<CatalogItem[]>([]);
    const [allDepartments, setAllDepartments] = useState<CatalogItem[]>([]);
    const [allSkills, setAllSkills] = useState<CatalogItem[]>([]);
    const [allEducationLevels, setAllEducationLevels] = useState<CatalogItem[]>([]);
    const [allPositions, setAllPositions] = useState<string[]>([]);
    const [allStatuses, setAllStatuses] = useState<string[]>([]);
    const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
    const [bulkSubmitting, setBulkSubmitting] = useState(false);
    const [bulkRejectForm] = Form.useForm();

    // Debounce ô tìm kiếm trước khi gọi API; đổi từ khóa thì quay về trang 1
    useEffect(() => {
        const t = setTimeout(() => {
            setKeyword(searchInput.trim());
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        getCatalogItems("/masterdata/rejection-reasons").then((r) => setRejectReasons(r.data));
        getCatalogItems("/masterdata/departments").then((r) => setAllDepartments(r.data));
        getCatalogItems("/masterdata/skills").then((r) => setAllSkills(r.data));
        getCatalogItems("/masterdata/education-levels").then((r) => setAllEducationLevels(r.data));
        getPostings({ size: 1000 }).then((r) =>
            setAllPositions(Array.from(new Set(r.data.content.map((p) => p.title))).sort()));
        getPipelines().then((r) =>
            setAllStatuses(Array.from(new Set(r.data.flatMap((p) => p.stages.map((s) => s.name)))).sort()));
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [candRes, appRes] = await Promise.all([
                getCandidates({ keyword: keyword || undefined, page: page - 1, size: pageSize }),
                getApplications(),          // lấy tất cả đơn ứng tuyển (không phân trang) để gộp vào từng ứng viên + thống kê
            ]);
            setCandidates(candRes.data.content);
            setTotalCandidates(candRes.data.totalItems);
            setAllApplications(appRes.data.content);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            notification.error({
                message: "Không tải được dữ liệu",
                description: axiosErr.response?.data?.message ?? "Vui lòng kiểm tra kết nối và thử lại.",
                placement: "topRight",
            });
        } finally {
            setLoading(false);
        }
    }, [notification, keyword, page, pageSize]);

    useEffect(() => { loadData(); }, [loadData]);

    // Gộp ứng viên (trang hiện tại) + danh sách vị trí đã ứng tuyển, ứng tuyển gần nhất lên đầu
    const candidatesWithApps: CandidateWithApplications[] = useMemo(() => {
        const appByCandidate = allApplications.reduce<Record<number, ApplicationResponse[]>>((acc, app) => {
            (acc[app.candidateId] ??= []).push(app);
            return acc;
        }, {});

        return candidates.map((c) => ({
            ...c,
            applications: appByCandidate[c.id] ?? [],
        }));
    }, [candidates, allApplications]);

    const matchesQuickFilter = useCallback(
        (apps: ApplicationResponse[]) => {
            if (!quickFilter) return true;
            const now = new Date();
            if (quickFilter === "new7d") {
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return apps.some((a) => new Date(a.appliedAt) >= sevenDaysAgo);
            }
            if (quickFilter === "cvScreening") {
                return apps.some((a) => a.currentStageType === "CV_SCREENING");
            }
            if (quickFilter === "interview") {
                return apps.some((a) => INTERVIEW_STAGE_TYPES.includes(a.currentStageType));
            }
            return apps.some((a) => {
                if (!a.hiredAt) return false;
                const d = new Date(a.hiredAt);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
        },
        [quickFilter],
    );

    const visibleCandidates = useMemo(() => {
        return candidatesWithApps.filter((c) => {
            if (departmentFilter && !c.applications.some((a) => a.departmentName === departmentFilter)) return false;
            if (positionFilter && !c.applications.some((a) => a.jobTitle === positionFilter)) return false;
            if (statusFilter && !c.applications.some((a) => a.currentStageName === statusFilter)) return false;
            if (!matchesQuickFilter(c.applications)) return false;
            return true;
        });
    }, [candidatesWithApps, departmentFilter, positionFilter, statusFilter, matchesQuickFilter]);

    const { wrapRef, scrollY } = useTableScrollY([loading, visibleCandidates.length]);

    const hasActiveFilters = !!(keyword || departmentFilter || positionFilter || statusFilter || quickFilter);

    const handleResetFilters = () => {
        setSearchInput("");
        setKeyword("");
        setDepartmentFilter(null);
        setPositionFilter(null);
        setStatusFilter(null);
        setQuickFilter(null);
        setPage(1);
    };

    const toggleQuickFilter = (next: Exclude<QuickFilter, null>) =>
        setQuickFilter((prev) => (prev === next ? null : next));

    // ── Thống kê KPI (dựa trên toàn bộ đơn ứng tuyển của công ty) ──
    const kpiStats = useMemo(() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const newApplications = allApplications.filter((a) => new Date(a.appliedAt) >= sevenDaysAgo).length;
        const cvScreening = allApplications.filter((a) => a.currentStageType === "CV_SCREENING").length;
        const interviews = allApplications.filter((a) => INTERVIEW_STAGE_TYPES.includes(a.currentStageType)).length;
        const hiredThisMonth = allApplications.filter((a) => {
            if (!a.hiredAt) return false;
            const d = new Date(a.hiredAt);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        return { newApplications, cvScreening, interviews, hiredThisMonth };
    }, [allApplications]);

    // ── Phân bổ ứng viên theo phòng ban (đếm ứng viên duy nhất theo departmentName) ──
    const departmentBreakdown = useMemo(() => {
        const candidateIdsByDept = new Map<string, Set<number>>();
        for (const app of allApplications) {
            if (!app.departmentName) continue;
            if (!candidateIdsByDept.has(app.departmentName)) candidateIdsByDept.set(app.departmentName, new Set());
            candidateIdsByDept.get(app.departmentName)!.add(app.candidateId);
        }
        return candidateIdsByDept;
    }, [allApplications]);

    // ── Tùy chọn bộ lọc: đầy đủ tất cả phòng ban / vị trí / trạng thái đang có của công ty,
    // kể cả những mục chưa có ứng viên nào ứng tuyển ──
    const departmentOptions = useMemo(() => {
        const names = new Set<string>(allDepartments.map((d) => String(d.name)));
        for (const name of departmentBreakdown.keys()) names.add(name);
        return Array.from(names)
            .map((name) => ({ name, count: departmentBreakdown.get(name)?.size ?? 0 }))
            .sort((a, b) => b.count - a.count);
    }, [allDepartments, departmentBreakdown]);

    const positionOptions = useMemo(() => {
        const names = new Set(allPositions);
        for (const a of allApplications) if (a.jobTitle) names.add(a.jobTitle);
        return Array.from(names).sort();
    }, [allPositions, allApplications]);

    const statusOptions = useMemo(() => {
        const names = new Set(allStatuses);
        for (const a of allApplications) if (a.currentStageName) names.add(a.currentStageName);
        return Array.from(names).sort();
    }, [allStatuses, allApplications]);

    /** ID của đơn ứng tuyển gần nhất cho mỗi ứng viên đang được chọn (bỏ qua ứng viên chưa ứng tuyển). */
    const getSelectedApplicationIds = () => {
        const ids: number[] = [];
        let skipped = 0;
        for (const key of selectedRowKeys) {
            const primary = candidatesWithApps.find((c) => c.id === key)?.applications[0];
            if (primary) ids.push(primary.id); else skipped++;
        }
        return { ids, skipped };
    };

    const reportBulkResult = (res: BulkOperationResponse, verb: string) => {
        const failedCount = Object.keys(res.failedIds).length;
        if (failedCount === 0) {
            message.success(`Đã ${verb} và gửi email cho ${res.succeededIds.length} hồ sơ`);
        } else {
            message.warning(`${res.succeededIds.length} hồ sơ thành công, ${failedCount} hồ sơ thất bại`);
            console.warn("Bulk action failures:", res.failedIds);
        }
        setSelectedRowKeys([]);
        loadData();
    };

    const handleBulkAdvance = () => {
        const { ids, skipped } = getSelectedApplicationIds();
        if (ids.length === 0) {
            message.warning("Các ứng viên đã chọn chưa có hồ sơ ứng tuyển nào để chuyển trạng thái");
            return;
        }
        modal.confirm({
            title: `Chuyển trạng thái cho ${ids.length} hồ sơ đã chọn?`,
            content: `Mỗi hồ sơ sẽ chuyển sang giai đoạn kế tiếp trong quy trình tuyển dụng và ứng viên sẽ nhận email thông báo tự động.${skipped ? ` (${skipped} ứng viên chưa ứng tuyển sẽ được bỏ qua.)` : ""}`,
            okText: "Chuyển & gửi email",
            onOk: async () => {
                const res = await bulkAdvanceApplicationStage(ids, "Chuyển trạng thái hàng loạt");
                reportBulkResult(res.data, "chuyển trạng thái");
            },
        });
    };

    const handleBulkReject = async () => {
        const values = await bulkRejectForm.validateFields();
        const { ids, skipped } = getSelectedApplicationIds();
        if (ids.length === 0) {
            message.warning("Các ứng viên đã chọn chưa có hồ sơ ứng tuyển nào để từ chối");
            return;
        }
        setBulkSubmitting(true);
        try {
            const res = await bulkRejectApplications(ids, values.rejectionReasonId, values.note);
            setBulkRejectOpen(false);
            bulkRejectForm.resetFields();
            if (skipped) message.info(`Đã bỏ qua ${skipped} ứng viên chưa ứng tuyển`);
            reportBulkResult(res.data, "từ chối");
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Thất bại");
        } finally {
            setBulkSubmitting(false);
        }
    };

    const handleExportExcel = () => {
        exportToExcel(
            "ung-vien",
            [
                { header: "Họ tên", value: (c: CandidateWithApplications) => c.fullName },
                { header: "Email", value: (c: CandidateWithApplications) => c.email },
                { header: "Điện thoại", value: (c: CandidateWithApplications) => c.phone },
                { header: "Phòng ban", value: (c: CandidateWithApplications) => Array.from(new Set(c.applications.map((a) => a.departmentName).filter(Boolean))).join(", ") },
                { header: "Vị trí ứng tuyển", value: (c: CandidateWithApplications) => c.applications.map((a) => a.jobTitle).join(", ") },
                { header: "Trạng thái", value: (c: CandidateWithApplications) => c.applications[0]?.currentStageName },
                { header: "Ngày ứng tuyển", value: (c: CandidateWithApplications) => c.applications[0]?.appliedAt },
            ],
            visibleCandidates,
        );
    };

    const getInitials = (name: string) => {
        const parts = name.split(" ").filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const AVATAR_COLORS = [GRADIENTS.stat1, GRADIENTS.stat2, GRADIENTS.stat3, GRADIENTS.stat4];

    const goToApplication = (candidateId: number, applicationId: number) => {
        navigate(`/candidates/${candidateId}/applications/${applicationId}`);
    };

    const columns: ColumnsType<CandidateWithApplications> = [
        {
            title: "Ứng viên",
            key: "candidate",
            width: 230,
            render: (_, record, index) => (
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <Avatar
                        size={30}
                        style={{
                            background: AVATAR_COLORS[index % AVATAR_COLORS.length],
                            color: "#fff", fontWeight: 600, fontSize: 12, flexShrink: 0,
                        }}
                    >
                        {getInitials(record.fullName)}
                    </Avatar>
                    <div style={{ minWidth: 0, lineHeight: 1.3 }}>
                        <div style={{ fontWeight: 600, color: COLORS.textPrimary, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {record.fullName}
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {record.email}{record.phone ? ` · ${record.phone}` : ""}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: "Vị trí",
            key: "position",
            width: 170,
            render: (_, record) => {
                const primary = record.applications[0];
                if (!primary) return <span style={{ color: COLORS.textMuted, fontSize: 12 }}>Chưa ứng tuyển</span>;
                return (
                    <div>
                        <div style={{ fontWeight: 500, color: COLORS.textPrimary }}>{primary.jobTitle || `Job #${primary.jobPostingId}`}</div>
                        {record.applications.length > 1 && (
                            <Tooltip title={record.applications.slice(1).map((a) => a.jobTitle).join(", ")}>
                                <div style={{ fontSize: 11, color: COLORS.textMuted }}>+{record.applications.length - 1} vị trí khác</div>
                            </Tooltip>
                        )}
                    </div>
                );
            },
        },
        {
            title: "Phòng ban",
            key: "department",
            width: 130,
            render: (_, record) => {
                const name = record.applications[0]?.departmentName;
                if (!name) return <span style={{ color: COLORS.textMuted }}>—</span>;
                return (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: departmentDotColor(name), flexShrink: 0 }} />
                        <span style={{ fontSize: 13 }}>{name}</span>
                    </div>
                );
            },
        },
        {
            title: "Ngày ứng tuyển",
            key: "appliedAt",
            width: 115,
            sorter: (a, b) => {
                const ta = a.applications[0] ? new Date(a.applications[0].appliedAt).getTime() : 0;
                const tb = b.applications[0] ? new Date(b.applications[0].appliedAt).getTime() : 0;
                return ta - tb;
            },
            render: (_, record) => {
                const primary = record.applications[0];
                if (!primary) return <span style={{ color: COLORS.textMuted }}>—</span>;
                return (
                    <span style={{ fontSize: 13 }}>
                        {new Date(primary.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                );
            },
        },
        {
            title: "Trạng thái",
            key: "status",
            width: 130,
            render: (_, record) => {
                const primary = record.applications[0];
                if (!primary) return <span style={{ color: COLORS.textMuted }}>—</span>;
                return (
                    <Tag color={stageTypeTagColor(primary.currentStageType)} style={{ margin: 0 }}>
                        {primary.currentStageName}
                    </Tag>
                );
            },
        },
        {
            title: "AI Score",
            key: "aiScore",
            width: 110,
            sorter: (a, b) => (getAiScore(a) ?? -1) - (getAiScore(b) ?? -1),
            render: (_, record) => <AiScoreBadge score={getAiScore(record)} />,
        },
    ];

    return (
        <div className="page-shell animate-fade-in">
            {/* ── Thống kê nhanh ─────────────────────────── */}
            <StatRow>
                <StatTile
                    icon={<UserOutlined />}
                    label="Tổng ứng viên"
                    value={totalCandidates}
                    accent={COLORS.primary}
                    active={!quickFilter}
                    onClick={() => setQuickFilter(null)}
                />
                <StatTile
                    icon={<UserAddOutlined />}
                    label="Đơn mới"
                    hint="7 ngày qua"
                    value={kpiStats.newApplications}
                    accent="#3B82F6"
                    active={quickFilter === "new7d"}
                    onClick={() => toggleQuickFilter("new7d")}
                />
                <StatTile
                    icon={<FileSearchOutlined />}
                    label="Sàng lọc CV"
                    hint="chờ duyệt"
                    value={kpiStats.cvScreening}
                    accent="#F59E0B"
                    active={quickFilter === "cvScreening"}
                    onClick={() => toggleQuickFilter("cvScreening")}
                />
                <StatTile
                    icon={<CalendarOutlined />}
                    label="Phỏng vấn"
                    hint="đang diễn ra"
                    value={kpiStats.interviews}
                    accent="#8B5CF6"
                    active={quickFilter === "interview"}
                    onClick={() => toggleQuickFilter("interview")}
                />
                <StatTile
                    icon={<TrophyOutlined />}
                    label="Đã tuyển"
                    hint="trong tháng"
                    value={kpiStats.hiredThisMonth}
                    accent={COLORS.success}
                    active={quickFilter === "hired"}
                    onClick={() => toggleQuickFilter("hired")}
                />
            </StatRow>

            {/* ── Bộ lọc ─────────────────────────────────── */}
            <FilterBar
                extra={
                    <>
                        <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>
                            Xuất Excel
                        </Button>
                        {isHr && (
                            <Button icon={<RobotOutlined />} onClick={() => setAiModalOpen(true)}>
                                AI Parse CV
                            </Button>
                        )}
                        {isHr && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormModalOpen(true)}>
                                Thêm ứng viên
                            </Button>
                        )}
                    </>
                }
            >
                <Input
                    prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
                    placeholder="Tìm theo tên, email, SĐT..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    style={{ width: 240 }}
                    allowClear
                />
                <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Phòng ban"
                    style={{ width: 180 }}
                    value={departmentFilter}
                    onChange={(v) => { setDepartmentFilter(v ?? null); setPage(1); }}
                    options={departmentOptions.map((d) => ({ value: d.name, label: `${d.name} (${d.count})` }))}
                />
                <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Vị trí"
                    style={{ width: 180 }}
                    value={positionFilter}
                    onChange={(v) => { setPositionFilter(v ?? null); setPage(1); }}
                    options={positionOptions.map((p) => ({ value: p, label: p }))}
                />
                <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Trạng thái"
                    style={{ width: 180 }}
                    value={statusFilter}
                    onChange={(v) => { setStatusFilter(v ?? null); setPage(1); }}
                    options={statusOptions.map((s) => ({ value: s, label: s }))}
                />
                {hasActiveFilters && <Button onClick={handleResetFilters}>Xóa bộ lọc</Button>}
            </FilterBar>

            <Card
                className="table-card-fill"
                style={listCardStyle}
                styles={{ body: listCardBodyStyle }}
            >
                {isHr && selectedRowKeys.length > 0 && (
                    <div
                        style={{
                            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                            padding: "10px 16px", marginBottom: 12, background: "#EFF6FF",
                            border: "1px solid #BFDBFE", borderRadius: 8, flexShrink: 0,
                        }}
                    >
                        <span>Đã chọn {selectedRowKeys.length} ứng viên</span>
                        <Button size="small" type="primary" icon={<MailOutlined />} onClick={handleBulkAdvance}>
                            Chuyển trạng thái & gửi email
                        </Button>
                        <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => setBulkRejectOpen(true)}>
                            Từ chối hàng loạt
                        </Button>
                        <Button size="small" type="text" onClick={() => setSelectedRowKeys([])}>
                            Bỏ chọn
                        </Button>
                    </div>
                )}

                <div ref={wrapRef} className="table-scroll-wrap">
                    <Table
                        rowKey="id"
                        size="small"
                        loading={loading}
                        columns={columns}
                        dataSource={visibleCandidates}
                        sticky
                        scroll={{ y: scrollY }}
                        rowSelection={isHr ? {
                            selectedRowKeys,
                            onChange: setSelectedRowKeys,
                        } : undefined}
                        onRow={(record) => {
                            const primary = record.applications[0];
                            return {
                                onClick: () => { if (primary) goToApplication(record.id, primary.id); },
                                style: { cursor: primary ? "pointer" : "default" },
                            };
                        }}
                        pagination={{
                            current: page,
                            pageSize,
                            total: totalCandidates,
                            ...listPagination("ứng viên"),
                            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                        }}
                        locale={{
                            emptyText: (
                                <EmptyState
                                    title="Chưa có ứng viên nào"
                                    description="Ứng viên phù hợp với bộ lọc hiện tại sẽ hiển thị ở đây."
                                />
                            ),
                        }}
                        rowHoverable
                    />
                </div>
            </Card>

            <CandidateFormModal
                open={formModalOpen}
                editingItem={null}
                initialValues={aiPrefilledData}
                initialFile={aiPrefilledFile}
                onClose={() => {
                    setFormModalOpen(false);
                    setAiPrefilledData(null);
                    setAiPrefilledFile(null);
                }}
                onSuccess={loadData}
            />

            <AiCvUploadModal
                open={aiModalOpen}
                availableSkills={allSkills}
                availableEducationLevels={allEducationLevels}
                onClose={() => setAiModalOpen(false)}
                onFillCandidate={(data, file) => {
                    setAiPrefilledData(data);
                    setAiPrefilledFile(file ?? null);
                    setAiModalOpen(false);
                    setFormModalOpen(true);
                }}
            />
            <Modal
                title={`Từ chối hàng loạt (${selectedRowKeys.length} ứng viên)`}
                open={bulkRejectOpen}
                onOk={handleBulkReject}
                onCancel={() => setBulkRejectOpen(false)}
                okText="Từ chối & gửi email"
                confirmLoading={bulkSubmitting}
                okButtonProps={{ danger: true }}
            >
                <Form form={bulkRejectForm} layout="vertical">
                    <Form.Item
                        name="rejectionReasonId"
                        label="Lý do"
                        rules={[{ required: true, message: "Chọn lý do" }]}
                    >
                        <Select options={rejectReasons.map((r) => ({ value: r.id, label: String(r.name) }))} />
                    </Form.Item>
                    <Form.Item name="note" label="Ghi chú">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
