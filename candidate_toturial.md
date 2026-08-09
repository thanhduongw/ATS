# FRONTEND (TYPESCRIPT) — CANDIDATE (TALENT POOL + APPLICATION KANBAN)

**Quyết định đã chốt:**
- 2 route riêng: `/candidates` (talent pool) và `/applications` (Kanban theo Job Posting)
- Application: **Kanban board**, cột = stage trong Pipeline, kéo-thả sang cột kế tiếp (hoặc cột "Từ chối")
- CV: tạo ứng viên trước, **upload CV sau** qua action riêng

Không cần cài thêm thư viện mới — `dayjs`, `@hello-pangea/dnd`, `@ant-design/icons` đã có từ các phase trước.

---

## CẤU TRÚC THƯ MỤC

```
src/features/candidate/
├── types.ts
├── candidateApi.ts
├── schemas/
│   ├── candidateSchema.ts
│   ├── applicationCreateSchema.ts
│   └── rejectApplicationSchema.ts
├── components/
│   ├── CandidateFormModal.tsx
│   ├── CvUploadModal.tsx
│   ├── ApplicationCreateModal.tsx
│   ├── ApplicationKanbanBoard.tsx
│   ├── ApplicationDetailDrawer.tsx
│   └── RejectApplicationModal.tsx
└── pages/
    ├── CandidatesPage.tsx
    └── ApplicationsPage.tsx
```

---

## BƯỚC 1: `src/features/candidate/types.ts`

```typescript
export interface CandidateResponse {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  currentPosition: string | null;
  educationLevelId: number | null;
  educationLevelName: string | null;
  skillIds: number[];
  skillNames: string[];
  cvFileUrl: string | null;
  createdAt: string;
}

export interface CandidateCreateRequest {
  fullName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  currentPosition?: string | null;
  educationLevelId?: number | null;
  skillIds?: number[] | null;
}

export type CandidateUpdateRequest = CandidateCreateRequest;

export interface ApplicationResponse {
  id: number;
  candidateId: number;
  candidateName: string;
  jobPostingId: number;
  recruitmentSourceId: number;
  recruitmentSourceName: string;
  assignedRecruiterId: number | null;
  assignedRecruiterName: string | null;
  resumeUrl: string;
  currentStageId: number;
  currentStageName: string;
  currentStageOrder: number;
  currentStageType: string;
  rejectionReasonId: number | null;
  rejectionReasonName: string | null;
  note: string | null;
  appliedAt: string;
}

export interface ApplicationCreateRequest {
  candidateId: number;
  jobPostingId: number;
  recruitmentSourceId: number;
  assignedRecruiterId?: number | null;
  resumeUrl?: string | null;
  note?: string | null;
}

export interface ApplicationAdvanceStageRequest {
  note?: string | null;
}

export interface ApplicationRejectRequest {
  rejectionReasonId: number;
  note?: string | null;
}

export interface ApplicationHistoryResponse {
  id: number;
  fromStageName: string | null;
  toStageName: string;
  note: string | null;
  changedByUserId: number;
  changedByUserName: string;
  changedAt: string;
}

export interface ApiMessageResponse {
  message: string;
}
```

---

## BƯỚC 2: `src/features/candidate/candidateApi.ts`

```typescript
import axiosClient from "../../services/axiosClient";
import type {
  CandidateResponse,
  CandidateCreateRequest,
  CandidateUpdateRequest,
  ApplicationResponse,
  ApplicationCreateRequest,
  ApplicationAdvanceStageRequest,
  ApplicationRejectRequest,
  ApplicationHistoryResponse,
} from "./types";

// ===== Candidate =====
export const getCandidates = () => axiosClient.get<CandidateResponse[]>("/candidate/candidates");

export const getCandidateById = (id: number) =>
  axiosClient.get<CandidateResponse>(`/candidate/candidates/${id}`);

export const createCandidate = (data: CandidateCreateRequest) =>
  axiosClient.post<CandidateResponse>("/candidate/candidates", data);

export const updateCandidate = (id: number, data: CandidateUpdateRequest) =>
  axiosClient.put<CandidateResponse>(`/candidate/candidates/${id}`, data);

export const uploadCandidateCv = (id: number, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosClient.post<CandidateResponse>(`/candidate/candidates/${id}/cv`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ===== Application =====
export const getApplications = (params?: { jobPostingId?: number; candidateId?: number }) =>
  axiosClient.get<ApplicationResponse[]>("/candidate/applications", { params });

export const getApplicationById = (id: number) =>
  axiosClient.get<ApplicationResponse>(`/candidate/applications/${id}`);

export const getApplicationHistory = (id: number) =>
  axiosClient.get<ApplicationHistoryResponse[]>(`/candidate/applications/${id}/history`);

export const createApplication = (data: ApplicationCreateRequest) =>
  axiosClient.post<ApplicationResponse>("/candidate/applications", data);

export const advanceApplicationStage = (id: number, data: ApplicationAdvanceStageRequest) =>
  axiosClient.patch<ApplicationResponse>(`/candidate/applications/${id}/advance-stage`, data);

export const rejectApplication = (id: number, data: ApplicationRejectRequest) =>
  axiosClient.patch<ApplicationResponse>(`/candidate/applications/${id}/reject`, data);
```

---

## BƯỚC 3: SCHEMA ZOD

`src/features/candidate/schemas/candidateSchema.ts`
```typescript
import { z } from "zod";

export const candidateSchema = z.object({
  fullName: z.string().min(1, "Họ tên không được để trống"),
  email: z.string().min(1, "Email không được để trống").email("Email không hợp lệ"),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  currentPosition: z.string().optional().nullable(),
  educationLevelId: z.number().optional().nullable(),
  skillIds: z.array(z.number()).optional().nullable(),
});

export type CandidateFormValues = z.infer<typeof candidateSchema>;
```

`src/features/candidate/schemas/applicationCreateSchema.ts`
```typescript
import { z } from "zod";

export const applicationCreateSchema = z.object({
  candidateId: z.number({ required_error: "Vui lòng chọn ứng viên" }),
  jobPostingId: z.number({ required_error: "Vui lòng chọn tin tuyển dụng" }),
  recruitmentSourceId: z.number({ required_error: "Vui lòng chọn nguồn tuyển dụng" }),
  assignedRecruiterId: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
});

export type ApplicationCreateFormValues = z.infer<typeof applicationCreateSchema>;
```

`src/features/candidate/schemas/rejectApplicationSchema.ts`
```typescript
import { z } from "zod";

export const rejectApplicationSchema = z.object({
  rejectionReasonId: z.number({ required_error: "Vui lòng chọn lý do từ chối" }),
  note: z.string().optional().nullable(),
});

export type RejectApplicationFormValues = z.infer<typeof rejectApplicationSchema>;
```

---

## BƯỚC 4: `components/CandidateFormModal.tsx`

```tsx
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, Input, Select, DatePicker, message } from "antd";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { candidateSchema, type CandidateFormValues } from "../schemas/candidateSchema";
import { createCandidate, updateCandidate } from "../candidateApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse, CandidateResponse } from "../types";

interface Props {
  open: boolean;
  editingItem: CandidateResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CandidateFormModal({ open, editingItem, onClose, onSuccess }: Props) {
  const [educationLevels, setEducationLevels] = useState<CatalogItem[]>([]);
  const [skills, setSkills] = useState<CatalogItem[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CandidateFormValues>({ resolver: zodResolver(candidateSchema) });

  useEffect(() => {
    if (!open) return;
    Promise.all([
      getCatalogItems("/masterdata/education-levels"),
      getCatalogItems("/masterdata/skills"),
    ]).then(([eduRes, skillRes]) => {
      setEducationLevels(eduRes.data);
      setSkills(skillRes.data);
    });
  }, [open]);

  useEffect(() => {
    if (editingItem) {
      reset({
        fullName: editingItem.fullName,
        email: editingItem.email,
        phone: editingItem.phone,
        dateOfBirth: editingItem.dateOfBirth,
        gender: editingItem.gender,
        address: editingItem.address,
        currentPosition: editingItem.currentPosition,
        educationLevelId: editingItem.educationLevelId,
        skillIds: editingItem.skillIds,
      });
    } else {
      reset({
        fullName: "",
        email: "",
        phone: "",
        dateOfBirth: null,
        gender: null,
        address: "",
        currentPosition: "",
        educationLevelId: null,
        skillIds: [],
      });
    }
  }, [editingItem, open, reset]);

  const onSubmit = async (data: CandidateFormValues) => {
    try {
      if (editingItem) {
        await updateCandidate(editingItem.id, data);
        message.success("Cập nhật thành công");
      } else {
        await createCandidate(data);
        message.success("Tạo ứng viên thành công");
      }
      onSuccess();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Thao tác thất bại");
    }
  };

  return (
    <Modal
      title={editingItem ? "Sửa ứng viên" : "Thêm ứng viên"}
      open={open}
      onOk={handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText={editingItem ? "Cập nhật" : "Tạo mới"}
      cancelText="Hủy"
      width={600}
      destroyOnHidden
    >
      <Form layout="vertical">
        <div style={{ display: "flex", gap: 16 }}>
          <Form.Item
            label="Họ tên"
            style={{ flex: 1 }}
            validateStatus={errors.fullName ? "error" : ""}
            help={errors.fullName?.message}
          >
            <Controller name="fullName" control={control} render={({ field }) => <Input {...field} />} />
          </Form.Item>
          <Form.Item
            label="Email"
            style={{ flex: 1 }}
            validateStatus={errors.email ? "error" : ""}
            help={errors.email?.message}
          >
            <Controller name="email" control={control} render={({ field }) => <Input {...field} />} />
          </Form.Item>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <Form.Item label="Số điện thoại" style={{ flex: 1 }}>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => <Input {...field} value={field.value ?? ""} />}
            />
          </Form.Item>
          <Form.Item label="Ngày sinh" style={{ flex: 1 }}>
            <Controller
              name="dateOfBirth"
              control={control}
              render={({ field }) => (
                <DatePicker
                  style={{ width: "100%" }}
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(date) => field.onChange(date ? date.format("YYYY-MM-DD") : null)}
                />
              )}
            />
          </Form.Item>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <Form.Item label="Giới tính" style={{ flex: 1 }}>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  allowClear
                  options={[
                    { value: "MALE", label: "Nam" },
                    { value: "FEMALE", label: "Nữ" },
                    { value: "OTHER", label: "Khác" },
                  ]}
                />
              )}
            />
          </Form.Item>
          <Form.Item label="Vị trí hiện tại" style={{ flex: 1 }}>
            <Controller
              name="currentPosition"
              control={control}
              render={({ field }) => <Input {...field} value={field.value ?? ""} />}
            />
          </Form.Item>
        </div>

        <Form.Item label="Địa chỉ">
          <Controller
            name="address"
            control={control}
            render={({ field }) => <Input {...field} value={field.value ?? ""} />}
          />
        </Form.Item>

        <Form.Item label="Trình độ học vấn">
          <Controller
            name="educationLevelId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                options={educationLevels.map((e) => ({ value: e.id, label: e.name as string }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Kỹ năng">
          <Controller
            name="skillIds"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                mode="multiple"
                options={skills.map((s) => ({ value: s.id, label: s.name as string }))}
              />
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

---

## BƯỚC 5: `components/CvUploadModal.tsx`

```tsx
import { useState } from "react";
import { Modal, Upload, Button, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import type { AxiosError } from "axios";
import { uploadCandidateCv } from "../candidateApi";
import type { ApiMessageResponse } from "../types";

interface Props {
  open: boolean;
  candidateId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CvUploadModal({ open, candidateId, onClose, onSuccess }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleUpload: UploadProps["customRequest"] = async (options) => {
    if (!candidateId) return;
    const { file, onSuccess: onUploadSuccess, onError } = options;
    setUploading(true);
    try {
      await uploadCandidateCv(candidateId, file as File);
      message.success("Tải CV lên thành công");
      onUploadSuccess?.("ok");
      onSuccess();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Tải CV thất bại");
      onError?.(err as Error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title="Tải CV lên" open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <Upload.Dragger customRequest={handleUpload} showUploadList={false} accept=".pdf,.doc,.docx" disabled={uploading}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Kéo thả file vào đây hoặc bấm để chọn file</p>
        <p className="ant-upload-hint">Hỗ trợ file PDF, DOC, DOCX</p>
      </Upload.Dragger>
      {uploading && (
        <Button loading style={{ marginTop: 12 }} block>
          Đang tải lên...
        </Button>
      )}
    </Modal>
  );
}
```

---

## BƯỚC 6: `components/ApplicationCreateModal.tsx`

```tsx
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, Select, Input, message } from "antd";
import type { AxiosError } from "axios";
import {
  applicationCreateSchema,
  type ApplicationCreateFormValues,
} from "../schemas/applicationCreateSchema";
import { createApplication, getCandidates } from "../candidateApi";
import { getPostings } from "../../recruitment/recruitmentApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { getUsers } from "../../auth/authApi";
import type { CandidateResponse } from "../types";
import type { JobPostingResponse } from "../../recruitment/types";
import type { CatalogItem } from "../../masterdata/types";
import type { UserSummaryResponse } from "../../auth/types";
import type { ApiMessageResponse } from "../types";

interface Props {
  open: boolean;
  presetCandidateId?: number;
  presetJobPostingId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApplicationCreateModal({
  open,
  presetCandidateId,
  presetJobPostingId,
  onClose,
  onSuccess,
}: Props) {
  const [candidates, setCandidates] = useState<CandidateResponse[]>([]);
  const [postings, setPostings] = useState<JobPostingResponse[]>([]);
  const [sources, setSources] = useState<CatalogItem[]>([]);
  const [recruiters, setRecruiters] = useState<UserSummaryResponse[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationCreateFormValues>({ resolver: zodResolver(applicationCreateSchema) });

  useEffect(() => {
    if (!open) return;
    Promise.all([
      getCandidates(),
      getPostings(),
      getCatalogItems("/masterdata/recruitment-sources"),
      getUsers("RECRUITER"),
    ]).then(([candRes, postRes, srcRes, recRes]) => {
      setCandidates(candRes.data);
      setPostings(postRes.data.filter((p) => p.status === "OPEN"));
      setSources(srcRes.data);
      setRecruiters(recRes.data);
    });
    reset({
      candidateId: presetCandidateId,
      jobPostingId: presetJobPostingId,
      recruitmentSourceId: undefined,
      assignedRecruiterId: undefined,
      note: "",
    });
  }, [open, presetCandidateId, presetJobPostingId, reset]);

  const onSubmit = async (data: ApplicationCreateFormValues) => {
    try {
      await createApplication(data);
      message.success("Ứng tuyển thành công");
      onSuccess();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Ứng tuyển thất bại");
    }
  };

  return (
    <Modal
      title="Thêm ứng viên vào tin tuyển dụng"
      open={open}
      onOk={handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText="Ứng tuyển"
      cancelText="Hủy"
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item
          label="Ứng viên"
          validateStatus={errors.candidateId ? "error" : ""}
          help={errors.candidateId?.message}
        >
          <Controller
            name="candidateId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                disabled={!!presetCandidateId}
                showSearch
                optionFilterProp="label"
                options={candidates.map((c) => ({ value: c.id, label: `${c.fullName} (${c.email})` }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Tin tuyển dụng"
          validateStatus={errors.jobPostingId ? "error" : ""}
          help={errors.jobPostingId?.message}
        >
          <Controller
            name="jobPostingId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                disabled={!!presetJobPostingId}
                options={postings.map((p) => ({ value: p.id, label: p.title }))}
                placeholder="Chỉ hiện tin đang mở"
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Nguồn tuyển dụng"
          validateStatus={errors.recruitmentSourceId ? "error" : ""}
          help={errors.recruitmentSourceId?.message}
        >
          <Controller
            name="recruitmentSourceId"
            control={control}
            render={({ field }) => (
              <Select {...field} options={sources.map((s) => ({ value: s.id, label: s.name as string }))} />
            )}
          />
        </Form.Item>

        <Form.Item label="Người phụ trách (không bắt buộc)">
          <Controller
            name="assignedRecruiterId"
            control={control}
            render={({ field }) => (
              <Select {...field} allowClear options={recruiters.map((r) => ({ value: r.id, label: r.fullName }))} />
            )}
          />
        </Form.Item>

        <Form.Item label="Ghi chú (không bắt buộc)">
          <Controller
            name="note"
            control={control}
            render={({ field }) => <Input.TextArea {...field} value={field.value ?? ""} rows={3} />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```
> Nếu tạo từ danh sách Ứng viên → `candidateId` bị khóa sẵn. Nếu tạo từ trang Kanban của 1 tin cụ thể → `jobPostingId` bị khóa sẵn. Dropdown "Tin tuyển dụng" chỉ hiện tin đang **Mở** — khớp đúng rule đã chốt (chỉ ứng tuyển được vào tin Open).

---

## BƯỚC 7: `components/RejectApplicationModal.tsx`

```tsx
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, Select, Input, message } from "antd";
import type { AxiosError } from "axios";
import { rejectApplicationSchema, type RejectApplicationFormValues } from "../schemas/rejectApplicationSchema";
import { rejectApplication } from "../candidateApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse } from "../types";

interface Props {
  open: boolean;
  applicationId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RejectApplicationModal({ open, applicationId, onClose, onSuccess }: Props) {
  const [reasons, setReasons] = useState<CatalogItem[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RejectApplicationFormValues>({ resolver: zodResolver(rejectApplicationSchema) });

  useEffect(() => {
    if (!open) return;
    reset({ rejectionReasonId: undefined, note: "" });
    getCatalogItems("/masterdata/rejection-reasons").then((res) => setReasons(res.data));
  }, [open, reset]);

  const onSubmit = async (data: RejectApplicationFormValues) => {
    if (!applicationId) return;
    try {
      await rejectApplication(applicationId, data);
      message.success("Đã từ chối hồ sơ");
      onSuccess();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Từ chối thất bại");
    }
  };

  return (
    <Modal
      title="Từ chối hồ sơ ứng tuyển"
      open={open}
      onOk={handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText="Từ chối"
      cancelText="Hủy"
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item
          label="Lý do từ chối"
          validateStatus={errors.rejectionReasonId ? "error" : ""}
          help={errors.rejectionReasonId?.message}
        >
          <Controller
            name="rejectionReasonId"
            control={control}
            render={({ field }) => (
              <Select {...field} options={reasons.map((r) => ({ value: r.id, label: r.name as string }))} />
            )}
          />
        </Form.Item>
        <Form.Item label="Ghi chú thêm (không bắt buộc)">
          <Controller
            name="note"
            control={control}
            render={({ field }) => <Input.TextArea {...field} value={field.value ?? ""} rows={3} />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

---

## BƯỚC 8: `components/ApplicationDetailDrawer.tsx`

```tsx
import { useEffect, useState } from "react";
import { Drawer, Descriptions, Timeline, Typography, Spin, Tag } from "antd";
import { getApplicationHistory } from "../candidateApi";
import type { ApplicationHistoryResponse, ApplicationResponse } from "../types";

const { Title } = Typography;

interface Props {
  open: boolean;
  application: ApplicationResponse | null;
  onClose: () => void;
}

export default function ApplicationDetailDrawer({ open, application, onClose }: Props) {
  const [history, setHistory] = useState<ApplicationHistoryResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !application) return;
    setLoading(true);
    getApplicationHistory(application.id)
      .then((res) => setHistory(res.data))
      .finally(() => setLoading(false));
  }, [open, application]);

  if (!application) return null;

  return (
    <Drawer title={application.candidateName} open={open} onClose={onClose} width={480}>
      <Tag color="blue" style={{ marginBottom: 16 }}>
        {application.currentStageName}
      </Tag>

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Nguồn tuyển dụng">{application.recruitmentSourceName}</Descriptions.Item>
        <Descriptions.Item label="Người phụ trách">{application.assignedRecruiterName ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="CV">
          <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
            Xem CV
          </a>
        </Descriptions.Item>
        <Descriptions.Item label="Ghi chú">{application.note ?? "—"}</Descriptions.Item>
        {application.rejectionReasonName && (
          <Descriptions.Item label="Lý do từ chối">{application.rejectionReasonName}</Descriptions.Item>
        )}
        <Descriptions.Item label="Ngày ứng tuyển">{application.appliedAt}</Descriptions.Item>
      </Descriptions>

      <Title level={5} style={{ marginTop: 24 }}>
        Lịch sử xử lý
      </Title>
      {loading ? (
        <Spin />
      ) : (
        <Timeline
          items={history.map((h) => ({
            children: (
              <>
                <div>{h.fromStageName ? `${h.fromStageName} → ${h.toStageName}` : `Bắt đầu: ${h.toStageName}`}</div>
                {h.note && <div style={{ color: "#999", fontSize: 12 }}>{h.note}</div>}
                <div style={{ color: "#999", fontSize: 12 }}>
                  {h.changedByUserName} · {h.changedAt}
                </div>
              </>
            ),
          }))}
        />
      )}
    </Drawer>
  );
}
```

---

## BƯỚC 9: `components/ApplicationKanbanBoard.tsx` (trọng tâm — kéo-thả tuần tự)

```tsx
import { useCallback, useEffect, useState } from "react";
import { Typography, Tag, Card, Empty, Spin, message } from "antd";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { AxiosError } from "axios";
import { getApplications, advanceApplicationStage } from "../candidateApi";
import { getPostingById } from "../../recruitment/recruitmentApi";
import { getPipelines } from "../../masterdata/masterdataApi";
import type { PipelineStageResponse } from "../../masterdata/types";
import type { ApiMessageResponse, ApplicationResponse } from "../types";
import ApplicationDetailDrawer from "./ApplicationDetailDrawer";
import RejectApplicationModal from "./RejectApplicationModal";

const { Text } = Typography;

interface Props {
  jobPostingId: number;
}

export default function ApplicationKanbanBoard({ jobPostingId }: Props) {
  const [stages, setStages] = useState<PipelineStageResponse[]>([]);
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationResponse | null>(null);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [pendingRejectId, setPendingRejectId] = useState<number | null>(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const postingRes = await getPostingById(jobPostingId);
      const pipelineListRes = await getPipelines();
      const pipeline = pipelineListRes.data.find((p) => p.id === postingRes.data.pipelineId);
      setStages(pipeline ? [...pipeline.stages].sort((a, b) => a.stageOrder - b.stageOrder) : []);

      const appsRes = await getApplications({ jobPostingId });
      setApplications(appsRes.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [jobPostingId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const applicationId = Number(result.draggableId);
    const sourceStageId = Number(result.source.droppableId);
    const destStageId = Number(result.destination.droppableId);
    if (sourceStageId === destStageId) return;

    const sourceStage = stages.find((s) => s.id === sourceStageId);
    const destStage = stages.find((s) => s.id === destStageId);
    if (!sourceStage || !destStage) return;

    if (destStage.stageType === "REJECTED") {
      setPendingRejectId(applicationId);
      setRejectModalOpen(true);
      return;
    }

    if (destStage.stageOrder !== sourceStage.stageOrder + 1) {
      message.error("Chỉ được chuyển sang giai đoạn kế tiếp trong quy trình, hoặc kéo sang cột Từ chối");
      return;
    }

    try {
      await advanceApplicationStage(applicationId, {});
      message.success("Đã chuyển giai đoạn");
      loadBoard();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Chuyển giai đoạn thất bại");
    }
  };

  const handleRejectSuccess = () => {
    setRejectModalOpen(false);
    setPendingRejectId(null);
    loadBoard();
  };

  if (loading) return <Spin />;
  if (stages.length === 0) return <Empty description="Không tải được quy trình tuyển dụng cho tin này" />;

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16 }}>
          {stages.map((stage) => {
            const cardsInStage = applications.filter((a) => a.currentStageId === stage.id);
            return (
              <div key={stage.id} style={{ minWidth: 260, flexShrink: 0 }}>
                <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                  <Text strong>{stage.name}</Text>
                  <Tag>{cardsInStage.length}</Tag>
                </div>
                <Droppable droppableId={String(stage.id)}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{ background: "#fafafa", borderRadius: 6, minHeight: 400, padding: 8 }}
                    >
                      {cardsInStage.map((app, index) => (
                        <Draggable key={app.id} draggableId={String(app.id)} index={index}>
                          {(dragProvided) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              style={{ marginBottom: 8, ...dragProvided.draggableProps.style }}
                            >
                              <Card
                                size="small"
                                hoverable
                                onClick={() => {
                                  setSelectedApplication(app);
                                  setDetailOpen(true);
                                }}
                              >
                                <Text strong>{app.candidateName}</Text>
                                <div>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {app.recruitmentSourceName}
                                  </Text>
                                </div>
                                {app.assignedRecruiterName && (
                                  <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      Phụ trách: {app.assignedRecruiterName}
                                    </Text>
                                  </div>
                                )}
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <ApplicationDetailDrawer open={detailOpen} application={selectedApplication} onClose={() => setDetailOpen(false)} />

      <RejectApplicationModal
        open={rejectModalOpen}
        applicationId={pendingRejectId}
        onClose={() => {
          setRejectModalOpen(false);
          setPendingRejectId(null);
        }}
        onSuccess={handleRejectSuccess}
      />
    </>
  );
}
```
**Cách hoạt động của rule tuần tự trên FE:**
- Kéo card sang cột có `stageOrder = cột hiện tại + 1` → gọi `advanceApplicationStage` bình thường.
- Kéo card sang cột có `stageType === "REJECTED"` → mở modal chọn lý do từ chối (bất kể đang ở cột nào, đúng rule "được từ chối từ bất kỳ giai đoạn nào").
- Kéo sang bất kỳ cột nào khác (nhảy cóc, hoặc lùi lại) → chỉ hiện `message.error`, **không gọi API** — vì danh sách card luôn được tính lại (`filter`) từ state `applications` (nguồn dữ liệu duy nhất là kết quả API), card sẽ tự "bật lại" đúng vị trí cũ mà không cần code revert thủ công.

---

## BƯỚC 10: `pages/CandidatesPage.tsx`

```tsx
import { useCallback, useEffect, useState } from "react";
import { Card, Table, Button, Tag, message } from "antd";
import { PlusOutlined, UploadOutlined, SendOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getCandidates } from "../candidateApi";
import type { ApiMessageResponse, CandidateResponse } from "../types";
import CandidateFormModal from "../components/CandidateFormModal";
import CvUploadModal from "../components/CvUploadModal";
import ApplicationCreateModal from "../components/ApplicationCreateModal";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CandidateResponse | null>(null);

  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [cvCandidateId, setCvCandidateId] = useState<number | null>(null);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyCandidateId, setApplyCandidateId] = useState<number | undefined>(undefined);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCandidates();
      setCandidates(res.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const columns = [
    { title: "Họ tên", dataIndex: "fullName", key: "fullName" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Điện thoại", dataIndex: "phone", key: "phone" },
    { title: "Học vấn", dataIndex: "educationLevelName", key: "educationLevelName" },
    {
      title: "Kỹ năng",
      dataIndex: "skillNames",
      key: "skillNames",
      render: (names: string[]) => names.map((n) => <Tag key={n}>{n}</Tag>),
    },
    {
      title: "CV",
      dataIndex: "cvFileUrl",
      key: "cvFileUrl",
      render: (url: string | null) =>
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            Xem CV
          </a>
        ) : (
          <Tag color="default">Chưa có</Tag>
        ),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: CandidateResponse) => (
        <>
          <Button
            type="link"
            onClick={() => {
              setEditingItem(record);
              setFormModalOpen(true);
            }}
          >
            Sửa
          </Button>
          <Button
            type="link"
            icon={<UploadOutlined />}
            onClick={() => {
              setCvCandidateId(record.id);
              setCvModalOpen(true);
            }}
          >
            CV
          </Button>
          <Button
            type="link"
            icon={<SendOutlined />}
            onClick={() => {
              setApplyCandidateId(record.id);
              setApplyModalOpen(true);
            }}
          >
            Ứng tuyển
          </Button>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Ứng viên (Talent Pool)</h2>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingItem(null);
              setFormModalOpen(true);
            }}
          >
            Thêm ứng viên
          </Button>
        </div>

        <Table rowKey="id" loading={loading} columns={columns} dataSource={candidates} pagination={{ pageSize: 10 }} />
      </Card>

      <CandidateFormModal
        open={formModalOpen}
        editingItem={editingItem}
        onClose={() => setFormModalOpen(false)}
        onSuccess={loadCandidates}
      />

      <CvUploadModal
        open={cvModalOpen}
        candidateId={cvCandidateId}
        onClose={() => setCvModalOpen(false)}
        onSuccess={loadCandidates}
      />

      <ApplicationCreateModal
        open={applyModalOpen}
        presetCandidateId={applyCandidateId}
        onClose={() => setApplyModalOpen(false)}
        onSuccess={loadCandidates}
      />
    </div>
  );
}
```

---

## BƯỚC 11: `pages/ApplicationsPage.tsx`

```tsx
import { useEffect, useState } from "react";
import { Card, Select, Button, Empty } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { getPostings } from "../../recruitment/recruitmentApi";
import type { JobPostingResponse } from "../../recruitment/types";
import ApplicationKanbanBoard from "../components/ApplicationKanbanBoard";
import ApplicationCreateModal from "../components/ApplicationCreateModal";

export default function ApplicationsPage() {
  const [postings, setPostings] = useState<JobPostingResponse[]>([]);
  const [selectedPostingId, setSelectedPostingId] = useState<number | undefined>(undefined);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getPostings().then((res) => setPostings(res.data));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, gap: 16 }}>
          <Select
            style={{ width: 360 }}
            placeholder="Chọn tin tuyển dụng để xem bảng ứng tuyển"
            value={selectedPostingId}
            onChange={setSelectedPostingId}
            options={postings.map((p) => ({ value: p.id, label: p.title }))}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!selectedPostingId}
            onClick={() => setApplyModalOpen(true)}
          >
            Thêm ứng viên vào tin
          </Button>
        </div>

        {selectedPostingId ? (
          <ApplicationKanbanBoard key={`${selectedPostingId}-${refreshKey}`} jobPostingId={selectedPostingId} />
        ) : (
          <Empty description="Chọn 1 tin tuyển dụng để xem bảng Kanban ứng tuyển" />
        )}
      </Card>

      <ApplicationCreateModal
        open={applyModalOpen}
        presetJobPostingId={selectedPostingId}
        onClose={() => setApplyModalOpen(false)}
        onSuccess={() => {
          setApplyModalOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
```
> Dùng `key={selectedPostingId-refreshKey}` để **buộc remount** `ApplicationKanbanBoard` sau khi thêm ứng viên mới — cách đơn giản và đủ tin cậy để force-reload 1 component con mà không cần expose thêm hàm `reload` qua ref.

---

## BƯỚC 12: CẬP NHẬT `src/routes/AppRoutes.tsx`

```tsx
import { Routes, Route, Navigate } from "react-router-dom";
import RegisterPage from "../features/auth/pages/RegisterPage";
import VerifyEmailPage from "../features/auth/pages/VerifyEmailPage";
import LoginPage from "../features/auth/pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import MasterDataPage from "../features/masterdata/pages/MasterDataPage";
import RecruitmentPage from "../features/recruitment/pages/RecruitmentPage";
import CandidatesPage from "../features/candidate/pages/CandidatesPage";
import ApplicationsPage from "../features/candidate/pages/ApplicationsPage";
import ProtectedRoute from "../components/ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/masterdata" element={<MasterDataPage />} />
        <Route path="/recruitment" element={<RecruitmentPage />} />
        <Route path="/candidates" element={<CandidatesPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
```

---

## BƯỚC 13: CHECKLIST TEST

1. Vào `/candidates` → "Thêm ứng viên" → điền thông tin, chọn kỹ năng → Lưu → thấy trong bảng, cột CV hiện tag "Chưa có"
2. Bấm nút "CV" trên dòng ứng viên vừa tạo → kéo thả 1 file PDF → thành công, cột CV chuyển thành link "Xem CV"
3. Bấm "Ứng tuyển" trên dòng ứng viên → Modal mở với `candidateId` đã khóa sẵn → chọn 1 tin đang Mở + nguồn tuyển dụng → Lưu → thành công
4. Vào `/applications` → chọn đúng tin vừa ứng tuyển → xác nhận thấy Kanban với đủ cột theo Pipeline, card ứng viên nằm ở cột đầu tiên (thường "Ứng tuyển")
5. Kéo card sang cột **kế tiếp ngay** (order+1) → thành công, card chuyển cột, số đếm ở 2 cột cập nhật đúng
6. Thử kéo card **nhảy cóc** 2 cột trở lên → card tự bật lại vị trí cũ, hiện `message.error`
7. Kéo card sang cột **Từ chối** (ở bất kỳ vị trí nào) → mở modal chọn lý do → xác nhận → card chuyển sang cột Từ chối
8. Click vào 1 card bất kỳ → Drawer chi tiết mở, xem đúng thông tin + Timeline lịch sử đúng thứ tự các bước đã thực hiện
9. Thử kéo tiếp 1 card đã ở cột Từ chối/Hired sang cột khác → phải bị BE chặn (`message.error` hiện lỗi "đã kết thúc quy trình")
10. Vào lại `/recruitment` tab "Tin tuyển dụng", mở sửa đúng tin vừa có ứng viên → xác nhận thấy cảnh báo khóa Pipeline (đã nối đúng luồng Phase 3 → Phase 4)

Nếu cả 10 bước pass, FE Candidate (Talent Pool + Kanban Application) đã hoàn chỉnh, khớp đúng toàn bộ BE Phase 4.