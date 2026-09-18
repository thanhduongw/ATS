import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Calendar,
  Card,
  App,
  Segmented,
  Select,
  DatePicker,
  Modal,
  Tag,
  Space,
  Button,
  Dropdown,
  Tooltip,
} from "antd";
import {
  CalendarOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  ScheduleOutlined,
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  UserOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  TeamOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type { AxiosError } from "axios";

import { getInterviews } from "../interviewApi";
import { getUserDirectory } from "../../auth/authApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { getPostings } from "../../recruitment/recruitmentApi";
import type { JobPostingResponse } from "../../recruitment/types";
import CandidateComparisonPanel from "../../offer/components/CandidateComparisonPanel";
import {
  INTERVIEW_HELD,
  type ApiMessageResponse,
  type InterviewResponse,
  type InterviewStatus as InterviewStatusType,
} from "../types";
import type { UserDirectoryResponse, UserRole } from "../../auth/types";
import InterviewDetailModal from "./InterviewDetailModal";
import EvaluationSummaryModal from "./EvaluationSummaryModal";
import InterviewQuickCreateModal from "./InterviewQuickCreateModal";
import BulkScheduleModal from "./BulkScheduleModal";
import InterviewTimeGrid from "./InterviewTimeGrid";
import InterviewListView from "./InterviewListView";
import { sessionAccent, sessionDescription, type SessionDisplay } from "../session";
import { COLORS } from "../../../app/theme";
import {
  INTERVIEW_STATUS,
  INTERVIEW_STATUS_ORDER,
  interviewStatusMeta,
} from "../../../app/statusLabels";
import { useAppSelector } from "../../../app/hooks";
import { useTrailNavigate } from "../../../app/useNavTrail";
import { HR_ROLES } from "../../../app/roles";
import StatTile from "../../../components/ui/StatTile";
import { StatRow, PageToolbar, FilterBar } from "../../../components/ui/pageKit";
import { listCardStyle } from "../../../components/ui/listStyles";

const { RangePicker } = DatePicker;

type ViewMode = "day" | "week" | "month" | "list";
type QuickFilter = "pendingHm" | "pendingCandidate" | "needEvaluation" | null;

export default function InterviewCalendar() {
  const { message } = App.useApp();
  const openApplication = useTrailNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
  const isHr = !!role && HR_ROLES.includes(role);

  // Mo len la danh sach: HR can thay ngay buoi nao sap toi va buoi nao can xu ly,
  // xem theo lich la nhu cau thu hai.
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [anchorDate, setAnchorDate] = useState<Dayjs>(dayjs());
  const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
  const [sessionSource, setSessionSource] = useState<InterviewResponse[]>([]);
  const [loading, setLoading] = useState(true);

  /** Buoi phong van dang mo bang tong hop danh gia (null = dong). */
  const [evaluationFor, setEvaluationFor] = useState<InterviewResponse | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<InterviewResponse | null>(null);

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateStart, setQuickCreateStart] = useState<Dayjs | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [interviewers, setInterviewers] = useState<UserDirectoryResponse[]>([]);
  const [workLocationMap, setWorkLocationMap] = useState<Record<number, string>>({});
  const [postings, setPostings] = useState<JobPostingResponse[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<number | undefined>(undefined);
  const [postingFilter, setPostingFilter] = useState<number | undefined>(undefined);
  const [compareOpen, setCompareOpen] = useState(false);
  const [interviewerId, setInterviewerId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<InterviewStatusType | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);

  const applicationIdParam = searchParams.get("applicationId");

  const loadInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const filteredRequest = getInterviews(
        applicationIdParam ? Number(applicationIdParam) : undefined,
        {
          interviewerId,
          status: statusFilter,
          fromDate: dateRange?.[0] ? dateRange[0].startOf("day").format("YYYY-MM-DDTHH:mm:ss") : undefined,
          toDate: dateRange?.[1] ? dateRange[1].endOf("day").format("YYYY-MM-DDTHH:mm:ss") : undefined,
        },
      );
      const hasServerFilter = !!applicationIdParam
        || interviewerId != null
        || statusFilter != null
        || dateRange?.[0] != null
        || dateRange?.[1] != null;
      const allRequest = hasServerFilter ? getInterviews() : filteredRequest;
      const [res, allRes] = await Promise.all([filteredRequest, allRequest]);
      setInterviews(res.data);
      setSessionSource(allRes.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Không tải được lịch phỏng vấn");
    } finally {
      setLoading(false);
    }
  }, [applicationIdParam, interviewerId, statusFilter, dateRange, message]);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  useEffect(() => {
    if (isHr) getUserDirectory("HIRING_MANAGER").then((r) => setInterviewers(r.data));
    getCatalogItems("/masterdata/work-locations").then((r) =>
      setWorkLocationMap(Object.fromEntries(r.data.map((w) => [w.id, String(w.name)]))),
    );
    // Danh sách tin tuyển dụng và phòng ban vừa dựng bộ lọc, vừa dùng để ghép tên
    // hiển thị dưới tên ứng viên — nên API buổi phỏng vấn chỉ cần trả về id.
    getCatalogItems("/masterdata/departments").then((r) =>
      setDepartments(r.data.map((d) => ({ id: d.id, name: String(d.name) }))),
    );
    getPostings({ size: 100 }).then((r) => setPostings(r.data.content));
  }, [isHr]);

  // Tự mở đúng buổi phỏng vấn khi đến từ thông báo (?highlightId=) hoặc từ 1 hồ sơ cụ thể (?applicationId=)
  useEffect(() => {
    if (interviews.length === 0) return;
    const highlightId = searchParams.get("highlightId");
    const target = highlightId
      ? interviews.find((i) => i.id === Number(highlightId))
      : applicationIdParam
        ? interviews[0]
        : null;
    if (target) {
      setSelected(target);
      setDetailOpen(true);
      setAnchorDate(dayjs(target.scheduledAt));
      if (highlightId) {
        const next = new URLSearchParams(searchParams);
        next.delete("highlightId");
        setSearchParams(next, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviews]);

  const postingMap = useMemo(
    () => Object.fromEntries(postings.map((p) => [p.id, p.title])) as Record<number, string>,
    [postings],
  );
  const departmentMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])) as Record<number, string>,
    [departments],
  );

  /** Chọn phòng ban thì danh sách tin thu hẹp theo phòng ban đó, giống màn xếp lịch hàng loạt. */
  const postingOptions = useMemo(
    () => (departmentFilter == null
      ? postings
      : postings.filter((p) => p.departmentId === departmentFilter)),
    [postings, departmentFilter],
  );

  /** Đổi phòng ban mà tin đang chọn không còn thuộc phòng ban mới thì bỏ chọn tin. */
  const onDepartmentFilterChange = (value?: number) => {
    setDepartmentFilter(value);
    if (postingFilter == null) return;
    const current = postings.find((p) => p.id === postingFilter);
    if (!current || (value != null && current.departmentId !== value)) {
      setPostingFilter(undefined);
    }
  };

  /* ── Thống kê ─────────────────────────────────────────── */
  const stats = useMemo(() => {
    const now = dayjs();
    const active = interviews.filter((i) => i.status !== "CANCELLED");
    return {
      today: active.filter((i) => dayjs(i.scheduledAt).isSame(now, "day")).length,
      week: active.filter((i) => dayjs(i.scheduledAt).isSame(now, "week")).length,
      pendingHm: interviews.filter((i) => i.status === "SCHEDULED").length,
      pendingCandidate: interviews.filter((i) => i.status === "HM_CONFIRMED").length,
      needEvaluation: interviews.filter(
        (i) =>
          INTERVIEW_HELD.has(i.status) &&
          dayjs(i.scheduledAt).add(i.durationMinutes ?? 60, "minute").isBefore(now) &&
          i.interviewers.some((p) => !p.evaluationSubmitted),
      ).length,
    };
  }, [interviews]);

  /* ── Áp lọc nhanh từ thẻ số liệu + lọc phòng ban / tin tuyển dụng ─────── */
  const visibleInterviews = useMemo(() => {
    // Hai bộ lọc này lọc ở phía giao diện: API buổi phỏng vấn chưa nhận tham số
    // phòng ban, mà lọc một nửa ở máy chủ một nửa ở đây thì khó lần khi sai số.
    let rows = interviews;
    if (departmentFilter != null) {
      rows = rows.filter((i) => i.departmentId === departmentFilter);
    }
    if (postingFilter != null) {
      rows = rows.filter((i) => i.jobPostingId === postingFilter);
    }

    if (quickFilter === "pendingHm") {
      return rows.filter((i) => i.status === "SCHEDULED");
    }
    if (quickFilter === "pendingCandidate") {
      return rows.filter((i) => i.status === "HM_CONFIRMED");
    }
    if (quickFilter === "needEvaluation") {
      const now = dayjs();
      return rows.filter(
        (i) =>
          INTERVIEW_HELD.has(i.status) &&
          dayjs(i.scheduledAt).add(i.durationMinutes ?? 60, "minute").isBefore(now) &&
          i.interviewers.some((p) => !p.evaluationSubmitted),
      );
    }
    return rows;
  }, [interviews, quickFilter, departmentFilter, postingFilter]);

  const sessionDisplayById = useMemo(() => {
    const sizes = new Map<number, number>();
    sessionSource.forEach((interview) => {
      if (interview.sessionId == null) return;
      sizes.set(interview.sessionId, (sizes.get(interview.sessionId) ?? 0) + 1);
    });
    const displays = new Map<number, SessionDisplay>();
    sizes.forEach((size, sessionId) => {
      displays.set(sessionId, { size, accent: sessionAccent(sessionId) });
    });
    return displays;
  }, [sessionSource]);

  const openDetail = (iv: InterviewResponse) => {
    setSelected(iv);
    setDetailOpen(true);
  };

  const openQuickCreate = (start: Dayjs | null) => {
    setQuickCreateStart(start);
    setQuickCreateOpen(true);
  };

  /* ── Điều hướng ngày ──────────────────────────────────── */
  const navUnit: dayjs.ManipulateType =
    viewMode === "day" ? "day" : viewMode === "week" ? "week" : "month";

  const periodLabel = useMemo(() => {
    if (viewMode === "day") return anchorDate.format("dddd, DD/MM/YYYY");
    if (viewMode === "week") {
      const s = anchorDate.startOf("week");
      const e = anchorDate.endOf("week");
      return s.isSame(e, "month")
        ? `${s.format("DD")} – ${e.format("DD/MM/YYYY")}`
        : `${s.format("DD/MM")} – ${e.format("DD/MM/YYYY")}`;
    }
    return `Tháng ${anchorDate.format("M, YYYY")}`;
  }, [viewMode, anchorDate]);

  const createMenuItems: MenuProps["items"] = [
    { key: "single", icon: <UserOutlined />, label: "1 ứng viên — chọn giờ cụ thể" },
    { key: "bulk", icon: <ThunderboltOutlined />, label: "Nhiều ứng viên — tự chia khung giờ" },
  ];

  const onCreateMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "single") openQuickCreate(null);
    if (key === "bulk") setBulkOpen(true);
  };

  return (
    <div className="page-shell animate-fade-in">
      {/* ── Thống kê nhanh ──────────────────────────── */}
      <StatRow>
        <StatTile
          icon={<CalendarOutlined />}
          label="Phỏng vấn hôm nay"
          value={stats.today}
          accent={COLORS.primary}
          onClick={() => {
            setQuickFilter(null);
            setAnchorDate(dayjs());
            setViewMode("day");
          }}
        />
        <StatTile
          icon={<ScheduleOutlined />}
          label="Trong tuần này"
          value={stats.week}
          accent="#3B82F6"
          onClick={() => {
            setQuickFilter(null);
            setAnchorDate(dayjs());
            setViewMode("week");
          }}
        />
        <StatTile
          icon={<TeamOutlined />}
          label={INTERVIEW_STATUS.SCHEDULED.label}
          value={stats.pendingHm}
          accent={INTERVIEW_STATUS.SCHEDULED.accent}
          active={quickFilter === "pendingHm"}
          onClick={() => {
            const next = quickFilter === "pendingHm" ? null : "pendingHm";
            setQuickFilter(next);
            if (next) setViewMode("list");
          }}
        />
        <StatTile
          icon={<ClockCircleOutlined />}
          label={INTERVIEW_STATUS.HM_CONFIRMED.label}
          value={stats.pendingCandidate}
          accent={INTERVIEW_STATUS.HM_CONFIRMED.accent}
          active={quickFilter === "pendingCandidate"}
          onClick={() => {
            const next = quickFilter === "pendingCandidate" ? null : "pendingCandidate";
            setQuickFilter(next);
            if (next) setViewMode("list");
          }}
        />
        <StatTile
          icon={<FileDoneOutlined />}
          label="Chưa có đánh giá"
          value={stats.needEvaluation}
          accent="#8B5CF6"
          active={quickFilter === "needEvaluation"}
          onClick={() => {
            const next = quickFilter === "needEvaluation" ? null : "needEvaluation";
            setQuickFilter(next);
            if (next) setViewMode("list");
          }}
        />
      </StatRow>

      {/* ── Điều hướng + chế độ xem + tạo lịch ──────── */}
      <PageToolbar
        left={
          <>
            <Space size={8} wrap>
          {viewMode !== "list" && (
            <>
              <Space.Compact>
                <Tooltip title="Kỳ trước">
                  <Button
                    icon={<LeftOutlined />}
                    onClick={() => setAnchorDate((d) => d.subtract(1, navUnit))}
                  />
                </Tooltip>
                <Button onClick={() => setAnchorDate(dayjs())}>Hôm nay</Button>
                <Tooltip title="Kỳ sau">
                  <Button
                    icon={<RightOutlined />}
                    onClick={() => setAnchorDate((d) => d.add(1, navUnit))}
                  />
                </Tooltip>
              </Space.Compact>
              <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>
                {periodLabel}
              </span>
            </>
          )}
          {viewMode === "list" && (
            <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>
              Danh sách phỏng vấn
            </span>
          )}
          {quickFilter && (
            <Tag
              closable
              onClose={() => setQuickFilter(null)}
              color="processing"
              style={{ margin: 0 }}
            >
              {quickFilter === "pendingHm"
                ? INTERVIEW_STATUS.SCHEDULED.label
                : quickFilter === "pendingCandidate"
                  ? INTERVIEW_STATUS.HM_CONFIRMED.label
                  : "Chưa có đánh giá"}
            </Tag>
          )}
            </Space>
          </>
        }
        right={
          <>
            <Segmented
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
              options={[
                { label: "Ngày", value: "day", icon: <CalendarOutlined /> },
                { label: "Tuần", value: "week", icon: <ScheduleOutlined /> },
                { label: "Tháng", value: "month", icon: <AppstoreOutlined /> },
                { label: "Danh sách", value: "list", icon: <UnorderedListOutlined /> },
              ]}
            />
            {isHr && (
              <Dropdown menu={{ items: createMenuItems, onClick: onCreateMenuClick }}>
                <Button type="primary" icon={<PlusOutlined />}>
                  Lên lịch
                </Button>
              </Dropdown>
            )}
          </>
        }
      />

      {/* ── Bộ lọc + chú thích màu ──────────────────── */}
      <FilterBar
        extra={viewMode === "list" ? undefined : INTERVIEW_STATUS_ORDER.map((s) => {
          const meta = interviewStatusMeta(s);
          return (
            <span
              key={s}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.textMuted }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: meta.bg,
                  borderLeft: `3px solid ${meta.accent}`,
                  display: "inline-block",
                }}
              />
              {meta.label}
            </span>
          );
        })}
      >
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Phòng ban"
            style={{ width: 180 }}
            value={departmentFilter}
            onChange={onDepartmentFilterChange}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tin tuyển dụng"
            style={{ width: 240 }}
            value={postingFilter}
            onChange={setPostingFilter}
            options={postingOptions.map((p) => ({ value: p.id, label: p.title }))}
          />
          {isHr && (
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Người phỏng vấn"
              style={{ width: 200 }}
              value={interviewerId}
              onChange={setInterviewerId}
              options={interviewers.map((u) => ({ value: u.id, label: u.fullName }))}
            />
          )}
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={INTERVIEW_STATUS_ORDER.map((s) => ({
              value: s,
              label: interviewStatusMeta(s).label,
            }))}
          />
          <RangePicker
            value={dateRange}
            onChange={(v) => setDateRange(v)}
            format="DD/MM/YYYY"
            placeholder={["Từ ngày", "Đến ngày"]}
          />
          {/* So sánh gắn với một tin tuyển dụng, nên phải chọn tin thì nút mới bật.
              Không xét số dòng đang hiển thị: bảng so sánh lấy toàn bộ hồ sơ của tin đó,
              không giới hạn theo khoảng ngày đang lọc. */}
          <Tooltip title={postingFilter == null ? "Chọn một tin tuyển dụng để so sánh" : undefined}>
            <Button
              icon={<SwapOutlined />}
              disabled={postingFilter == null}
              onClick={() => setCompareOpen(true)}
            >
              So sánh ứng viên
            </Button>
          </Tooltip>
      </FilterBar>

      {/* ── Nội dung ────────────────────────────────── */}
      {viewMode === "list" ? (
        <InterviewListView
          interviews={visibleInterviews}
          loading={loading}
          workLocationMap={workLocationMap}
          postingMap={postingMap}
          departmentMap={departmentMap}
          sessionDisplayById={sessionDisplayById}
          onSelect={openDetail}
          onOpenEvaluation={setEvaluationFor}
          onOpenApplication={openApplication}
        />
      ) : viewMode === "month" ? (
        <Card
          className="table-card-fill"
          style={listCardStyle}
          styles={{ body: { flex: 1, minHeight: 0, overflowY: "auto", padding: 12 } }}
        >
          <Calendar
            value={anchorDate}
            headerRender={() => null}
            onSelect={(date, info) => {
              if (info.source === "date") {
                setAnchorDate(date);
                setViewMode("day");
              }
            }}
            onPanelChange={(date) => setAnchorDate(date)}
            cellRender={(current, info) => {
              if (info.type !== "date") return info.originNode;
              const day = current as Dayjs;
              const dayItems = visibleInterviews
                .filter((i) => dayjs(i.scheduledAt).isSame(day, "day"))
                .sort((a, b) => dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf());
              if (dayItems.length === 0) return null;

              const shown = dayItems.slice(0, 3);
              const rest = dayItems.length - shown.length;

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {shown.map((iv) => {
                    const meta = interviewStatusMeta(iv.status);
                    const session = iv.sessionId == null
                      ? undefined
                      : sessionDisplayById.get(iv.sessionId);
                    return (
                      <div
                        key={iv.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(iv);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "2px 6px",
                          borderRadius: 5,
                          background: meta.bg,
                          borderLeft: `3px solid ${meta.accent}`,
                          borderRight: session ? `3px solid ${session.accent}` : undefined,
                          fontSize: 11,
                          lineHeight: 1.5,
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          cursor: "pointer",
                          opacity: iv.status === "CANCELLED" ? 0.6 : 1,
                        }}
                      >
                        <strong style={{ color: meta.accent, fontVariantNumeric: "tabular-nums" }}>
                          {dayjs(iv.scheduledAt).format("HH:mm")}
                        </strong>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            color: COLORS.textPrimary,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {iv.candidateName}
                        </span>
                        {iv.sessionId != null && session && (
                          <Tooltip title={sessionDescription(iv.sessionId, session.size)}>
                            <span
                              style={{
                                flexShrink: 0,
                                padding: "0 4px",
                                borderRadius: 999,
                                border: `1px solid ${session.accent}55`,
                                background: `${session.accent}14`,
                                color: session.accent,
                                fontSize: 9,
                                fontWeight: 700,
                              }}
                            >
                              Lô {session.size}
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                  {rest > 0 && (
                    <div style={{ fontSize: 11, color: COLORS.textMuted, paddingLeft: 6 }}>
                      +{rest} buổi nữa
                    </div>
                  )}
                </div>
              );
            }}
          />
        </Card>
      ) : (
        <Card
          className="table-card-fill"
          style={listCardStyle}
          styles={{
            body: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 },
          }}
        >
          <InterviewTimeGrid
            interviews={visibleInterviews}
            mode={viewMode}
            anchorDate={anchorDate}
            workLocationMap={workLocationMap}
            sessionDisplayById={sessionDisplayById}
            onSelectInterview={openDetail}
            onSelectEmptySlot={isHr ? openQuickCreate : undefined}
          />
        </Card>
      )}

      {/* Mở ngay tại trang thay vì điều hướng đi: đóng lại là còn nguyên bộ lọc,
          khoảng ngày và chế độ xem đang dở. */}
      <Modal
        title={
          postingFilter == null
            ? "So sánh ứng viên"
            : `So sánh ứng viên · ${postingMap[postingFilter] ?? ""}`
        }
        open={compareOpen}
        onCancel={() => setCompareOpen(false)}
        footer={null}
        width="min(2200px, 98vw)"
        style={{ top: 16 }}
        styles={{ body: { maxHeight: "86vh", overflowY: "auto", paddingLeft: 12, paddingRight: 12 } }}
        destroyOnHidden
      >
        {postingFilter != null && (
          <CandidateComparisonPanel jobPostingId={postingFilter} showHeader={false} />
        )}
      </Modal>

      <EvaluationSummaryModal
        open={evaluationFor != null}
        interview={evaluationFor}
        onClose={() => setEvaluationFor(null)}
      />

      <InterviewDetailModal
        open={detailOpen}
        interview={selected}
        onClose={() => setDetailOpen(false)}
        onChanged={loadInterviews}
      />

      <InterviewQuickCreateModal
        open={quickCreateOpen}
        defaultStart={quickCreateStart}
        onClose={() => setQuickCreateOpen(false)}
        onSuccess={loadInterviews}
      />

      <BulkScheduleModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={loadInterviews}
      />
    </div>
  );
}
