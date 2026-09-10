import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Calendar,
  Card,
  App,
  Segmented,
  Select,
  DatePicker,
  Table,
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
  VideoCameraOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";

import { getInterviews } from "../interviewApi";
import { getUserDirectory } from "../../auth/authApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type {
  ApiMessageResponse,
  InterviewResponse,
  InterviewStatus as InterviewStatusType,
} from "../types";
import type { UserDirectoryResponse, UserRole } from "../../auth/types";
import InterviewDetailModal from "./InterviewDetailModal";
import InterviewQuickCreateModal from "./InterviewQuickCreateModal";
import BulkScheduleModal from "./BulkScheduleModal";
import InterviewTimeGrid from "./InterviewTimeGrid";
import { COLORS } from "../../../app/theme";
import { interviewStatusMeta, INTERVIEW_STATUS_ORDER } from "../interviewStatus";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import EmptyState from "../../../components/ui/EmptyState";
import StatTile from "../../../components/ui/StatTile";
import { StatRow, PageToolbar, FilterBar } from "../../../components/ui/pageKit";
import { listCardStyle, listCardBodyStyle, listPagination } from "../../../components/ui/listStyles";

const { RangePicker } = DatePicker;

type ViewMode = "day" | "week" | "month" | "list";
type QuickFilter = "pendingConfirm" | "needEvaluation" | null;

export default function InterviewCalendar() {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
  const isHr = !!role && HR_ROLES.includes(role);

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState<Dayjs>(dayjs());
  const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<InterviewResponse | null>(null);

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateStart, setQuickCreateStart] = useState<Dayjs | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [interviewers, setInterviewers] = useState<UserDirectoryResponse[]>([]);
  const [workLocationMap, setWorkLocationMap] = useState<Record<number, string>>({});
  const [interviewerId, setInterviewerId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<InterviewStatusType | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);

  const applicationIdParam = searchParams.get("applicationId");

  const loadInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInterviews(
        applicationIdParam ? Number(applicationIdParam) : undefined,
        {
          interviewerId,
          status: statusFilter,
          fromDate: dateRange?.[0] ? dateRange[0].startOf("day").format("YYYY-MM-DDTHH:mm:ss") : undefined,
          toDate: dateRange?.[1] ? dateRange[1].endOf("day").format("YYYY-MM-DDTHH:mm:ss") : undefined,
        },
      );
      setInterviews(res.data);
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

  /* ── Thống kê ─────────────────────────────────────────── */
  const stats = useMemo(() => {
    const now = dayjs();
    const active = interviews.filter((i) => i.status !== "CANCELLED");
    return {
      today: active.filter((i) => dayjs(i.scheduledAt).isSame(now, "day")).length,
      week: active.filter((i) => dayjs(i.scheduledAt).isSame(now, "week")).length,
      pendingConfirm: interviews.filter(
        (i) => i.status === "SCHEDULED" && !i.candidateConfirmed,
      ).length,
      needEvaluation: active.filter(
        (i) =>
          dayjs(i.scheduledAt).isBefore(now) &&
          i.interviewers.some((p) => !p.evaluationSubmitted),
      ).length,
    };
  }, [interviews]);

  /* ── Áp lọc nhanh từ thẻ số liệu ──────────────────────── */
  const visibleInterviews = useMemo(() => {
    if (quickFilter === "pendingConfirm") {
      return interviews.filter((i) => i.status === "SCHEDULED" && !i.candidateConfirmed);
    }
    if (quickFilter === "needEvaluation") {
      const now = dayjs();
      return interviews.filter(
        (i) =>
          i.status !== "CANCELLED" &&
          dayjs(i.scheduledAt).isBefore(now) &&
          i.interviewers.some((p) => !p.evaluationSubmitted),
      );
    }
    return interviews;
  }, [interviews, quickFilter]);

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
    { key: "bulk", icon: <ThunderboltOutlined />, label: "Nhiều ứng viên — tự chia slot" },
  ];

  const onCreateMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "single") openQuickCreate(null);
    if (key === "bulk") setBulkOpen(true);
  };

  /* ── Cột bảng cho chế độ Danh sách ────────────────────── */
  const columns: ColumnsType<InterviewResponse> = [
    {
      title: "Ứng viên",
      dataIndex: "candidateName",
      key: "candidateName",
      ellipsis: true,
      render: (name: string, r) => {
        const meta = interviewStatusMeta(r.status);
        return (
          <Space size={8}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: meta.accent,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 500 }}>{name}</span>
          </Space>
        );
      },
    },
    {
      title: "Thời gian",
      key: "scheduledAt",
      width: 170,
      render: (_, r) => (
        <div style={{ lineHeight: 1.4 }}>
          <div style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {dayjs(r.scheduledAt).format("HH:mm")} –{" "}
            {dayjs(r.scheduledAt).add(r.durationMinutes ?? 60, "minute").format("HH:mm")}
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>
            {dayjs(r.scheduledAt).format("dddd, DD/MM/YYYY")}
          </div>
        </div>
      ),
      sorter: (a, b) => dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf(),
      defaultSortOrder: "ascend",
    },
    {
      title: "Hình thức / Địa điểm",
      key: "format",
      width: 190,
      ellipsis: true,
      render: (_, r) => (
        <Space size={6}>
          {r.format === "ONLINE" ? (
            <VideoCameraOutlined style={{ color: COLORS.textMuted }} />
          ) : (
            <EnvironmentOutlined style={{ color: COLORS.textMuted }} />
          )}
          <span style={{ fontSize: 13 }}>
            {r.format === "ONLINE"
              ? "Online"
              : r.workLocationId
                ? workLocationMap[r.workLocationId] ?? "Offline"
                : "Offline"}
          </span>
        </Space>
      ),
    },
    {
      title: "Người phỏng vấn",
      key: "interviewers",
      width: 220,
      ellipsis: true,
      render: (_, r) => r.interviewers.map((i) => i.fullName).join(", ") || "—",
    },
    {
      title: "Đánh giá",
      key: "evaluation",
      width: 120,
      render: (_, r) => {
        const done = r.interviewers.filter((i) => i.evaluationSubmitted).length;
        const total = r.interviewers.length;
        if (total === 0) return <span style={{ color: COLORS.textMuted }}>—</span>;
        return (
          <Tag color={done === total ? "success" : "default"} style={{ margin: 0 }}>
            {done}/{total}
          </Tag>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 165,
      render: (status: string) => {
        const meta = interviewStatusMeta(status);
        return (
          <Tag color={meta.tag} style={{ margin: 0 }}>
            {meta.label}
          </Tag>
        );
      },
    },
  ];

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
          icon={<ClockCircleOutlined />}
          label="Chờ ứng viên xác nhận"
          value={stats.pendingConfirm}
          accent="#F59E0B"
          active={quickFilter === "pendingConfirm"}
          onClick={() => {
            const next = quickFilter === "pendingConfirm" ? null : "pendingConfirm";
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
              {quickFilter === "pendingConfirm" ? "Chờ ứng viên xác nhận" : "Chưa có đánh giá"}
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
        extra={INTERVIEW_STATUS_ORDER.map((s) => {
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
      </FilterBar>

      {/* ── Nội dung ────────────────────────────────── */}
      {viewMode === "list" ? (
        <Card
          className="table-card-fill"
          style={listCardStyle}
          styles={{ body: listCardBodyStyle }}
        >
          <div className="table-scroll-wrap" style={{ flex: 1, minHeight: 0 }}>
            <Table
              rowKey="id"
              size="small"
              loading={loading}
              columns={columns}
              dataSource={visibleInterviews}
              onRow={(record) => ({
                onClick: () => openDetail(record),
                style: { cursor: "pointer" },
              })}
              pagination={{ pageSize: 20, ...listPagination("buổi phỏng vấn") }}
              locale={{
                emptyText: (
                  <EmptyState
                    title="Chưa có lịch phỏng vấn nào"
                    description="Lịch phỏng vấn phù hợp với bộ lọc sẽ hiển thị ở đây."
                  />
                ),
              }}
            />
          </div>
        </Card>
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
                            color: COLORS.textPrimary,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {iv.candidateName}
                        </span>
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
            onSelectInterview={openDetail}
            onSelectEmptySlot={isHr ? openQuickCreate : undefined}
          />
        </Card>
      )}

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
