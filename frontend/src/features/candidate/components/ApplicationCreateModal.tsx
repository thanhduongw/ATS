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
      setCandidates(candRes.data.content);
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

        <Form.Item label="Người phụ trách ">
          <Controller
            name="assignedRecruiterId"
            control={control}
            render={({ field }) => (
              <Select {...field} allowClear options={recruiters.map((r) => ({ value: r.id, label: r.fullName }))} />
            )}
          />
        </Form.Item>

        <Form.Item label="Ghi chú ">
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
