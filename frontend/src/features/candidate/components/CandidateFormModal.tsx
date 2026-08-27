import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Form, Input, InputNumber, Select, DatePicker, Upload, message } from "antd";
import {
  InboxOutlined,
  FileTextOutlined,
  UserAddOutlined,
  EditOutlined,
  UserOutlined,
  TrophyOutlined,
  LockOutlined,
  FormOutlined,
} from "@ant-design/icons";
import { ModalTitle } from "../../../components/ui/pageKit";
import { SectionHeader, SectionContainer } from "../../../components/ui/sectionKit";
import { COLORS } from "../../../app/theme";

/** Lưới 3 cột cho trường ngắn, 2 cột cho trường dài — tận dụng chiều ngang modal rộng. */
const grid3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  columnGap: 12,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  columnGap: 12,
};

const spanAll: React.CSSProperties = { gridColumn: "1 / -1" };
import type { UploadProps } from "antd";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { candidateSchema, type CandidateFormValues } from "../schemas/candidateSchema";
import { createCandidate, updateCandidate, uploadCandidateCv } from "../candidateApi";
import { getCustomFieldDefinitions } from "../customFieldApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse, CandidateResponse, CustomFieldDefinition } from "../types";

interface Props {
  open: boolean;
  editingItem: CandidateResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CandidateFormModal({ open, editingItem, onClose, onSuccess }: Props) {
  const [educationLevels, setEducationLevels] = useState<CatalogItem[]>([]);
  const [skills, setSkills] = useState<CatalogItem[]>([]);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);

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
      getCustomFieldDefinitions(),
    ]).then(([eduRes, skillRes, customFieldRes]) => {
      setEducationLevels(eduRes.data);
      setSkills(skillRes.data);
      setCustomFieldDefs(customFieldRes.data.filter((d) => d.active));
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
        internalNote: editingItem.internalNote,
      });
      setCustomFieldValues(editingItem.customFields ?? {});
      setCvFile(null);
      setCvError(null);
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
        internalNote: "",
      });
      setCustomFieldValues({});
      setCvFile(null);
      setCvError(null);
    }
  }, [editingItem, open, reset]);

  const handleCvChange: UploadProps["onChange"] = (info) => {
    const file = info.fileList[0]?.originFileObj as File | undefined;
    setCvFile(file ?? null);
    if (file) setCvError(null);
  };

  const onSubmit = async (data: CandidateFormValues) => {
    if (!editingItem && !cvFile) {
      setCvError("Vui lòng tải lên CV của ứng viên");
      return;
    }
    try {
      const payload = { ...data, customFields: customFieldValues };
      let candidateId: number;
      if (editingItem) {
        await updateCandidate(editingItem.id, payload);
        candidateId = editingItem.id;
      } else {
        const res = await createCandidate(payload);
        candidateId = res.data.id;
      }
      if (cvFile) {
        try {
          await uploadCandidateCv(candidateId, cvFile);
        } catch {
          message.warning("Đã lưu hồ sơ nhưng tải CV lên thất bại, vui lòng thử tải lại CV sau.");
          onSuccess();
          onClose();
          return;
        }
      }
      message.success(editingItem ? "Cập nhật thành công" : "Tạo ứng viên thành công");
      onSuccess();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse & { error?: string }>;
      const msg = axiosErr.response?.data?.message || axiosErr.response?.data?.error || axiosErr.message || "Thao tác thất bại";
      message.error(msg);
    }
  };


  return (
    <Modal
      title={
        <ModalTitle
          icon={editingItem ? <EditOutlined /> : <UserAddOutlined />}
          title={editingItem ? "Sửa ứng viên" : "Thêm ứng viên"}
          subtitle="Thông tin hồ sơ ứng viên trong kho nhân tài"
        />
      }
      open={open}
      onOk={handleSubmit(onSubmit)}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText={editingItem ? "Cập nhật" : "Tạo mới"}
      cancelText="Hủy"
      width={960}
      centered
      destroyOnHidden
      styles={{
        body: { maxHeight: "72vh", overflowY: "auto", padding: 12, background: "#FAFBFC" },
        footer: { padding: 12, borderTop: `1px solid ${COLORS.borderLight}` },
      }}
    >
      <Form layout="vertical">
        <SectionContainer>
          <SectionHeader icon={<UserOutlined />} title="Thông tin cơ bản" subtitle="Thông tin liên hệ và nhân khẩu của ứng viên" />
          <div style={grid3}>
            <Form.Item
              label="Họ tên"
              validateStatus={errors.fullName ? "error" : ""}
              help={errors.fullName?.message}
            >
              <Controller name="fullName" control={control} render={({ field }) => <Input {...field} />} />
            </Form.Item>
            <Form.Item
              label="Email"
              validateStatus={errors.email ? "error" : ""}
              help={errors.email?.message}
            >
              <Controller name="email" control={control} render={({ field }) => <Input {...field} />} />
            </Form.Item>
            <Form.Item label="Số điện thoại">
              <Controller
                name="phone"
                control={control}
                render={({ field }) => <Input {...field} value={field.value ?? ""} />}
              />
            </Form.Item>
            <Form.Item label="Ngày sinh">
              <Controller
                name="dateOfBirth"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    style={{ width: "100%" }}
                    format="DD/MM/YYYY"
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(date) => field.onChange(date ? date.format("YYYY-MM-DD") : null)}
                  />
                )}
              />
            </Form.Item>
            <Form.Item label="Giới tính">
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    allowClear
                    placeholder="Chọn giới tính"
                    options={[
                      { value: "MALE", label: "Nam" },
                      { value: "FEMALE", label: "Nữ" },
                      { value: "OTHER", label: "Khác" },
                    ]}
                  />
                )}
              />
            </Form.Item>
            <Form.Item label="Vị trí hiện tại">
              <Controller
                name="currentPosition"
                control={control}
                render={({ field }) => <Input {...field} value={field.value ?? ""} />}
              />
            </Form.Item>
            <Form.Item label="Địa chỉ" style={spanAll}>
              <Controller
                name="address"
                control={control}
                render={({ field }) => <Input {...field} value={field.value ?? ""} />}
              />
            </Form.Item>
          </div>
        </SectionContainer>

        <SectionContainer>
          <SectionHeader icon={<FileTextOutlined />} title="CV / Hồ sơ đính kèm" subtitle="Hỗ trợ tệp PDF, DOC, DOCX" />
          <Form.Item
            validateStatus={cvError ? "error" : ""}
            help={cvError ?? (editingItem ? undefined : "Bắt buộc khi tạo ứng viên mới")}
          >
            {editingItem?.cvFileUrl && !cvFile && (
              <div style={{ marginBottom: 8 }}>
                <a href={editingItem.cvFileUrl} target="_blank" rel="noopener noreferrer">
                  <FileTextOutlined /> Xem CV hiện tại
                </a>
                <span style={{ color: "#9CA3AF", fontSize: 12, marginLeft: 8 }}>(tải file mới để thay thế)</span>
              </div>
            )}
            <Upload.Dragger
              beforeUpload={() => false}
              onChange={handleCvChange}
              maxCount={1}
              accept=".pdf,.doc,.docx"
            >
              {cvFile ? (
                <div style={{ padding: "8px 0" }}>
                  <FileTextOutlined style={{ fontSize: 20 }} /> <span>{cvFile.name}</span>
                </div>
              ) : (
                <>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Kéo thả file CV vào đây hoặc bấm để chọn file</p>
                  <p className="ant-upload-hint">Hỗ trợ file PDF, DOC, DOCX</p>
                </>
              )}
            </Upload.Dragger>
          </Form.Item>
        </SectionContainer>

        <SectionContainer>
          <SectionHeader icon={<TrophyOutlined />} title="Chuyên môn" subtitle="Trình độ và kỹ năng phục vụ sàng lọc hồ sơ" />
          <div style={grid2}>
            <Form.Item label="Trình độ học vấn">
              <Controller
                name="educationLevelId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    allowClear
                    placeholder="Chọn trình độ học vấn"
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
                    placeholder="Chọn kỹ năng của ứng viên"
                    options={skills.map((s) => ({ value: s.id, label: s.name as string }))}
                  />
                )}
              />
            </Form.Item>
          </div>
        </SectionContainer>

        <SectionContainer style={{ marginBottom: customFieldDefs.length > 0 ? 12 : 4 }}>
          <SectionHeader
            icon={<LockOutlined />}
            title="Ghi chú nội bộ"
            subtitle="Chỉ HR/Manager thấy — không hiển thị cho ứng viên hoặc trên career portal"
          />
          <Form.Item>
            <Controller
              name="internalNote"
              control={control}
              render={({ field }) => (
                <Input.TextArea {...field} value={field.value ?? ""} rows={3} placeholder="Ghi chú riêng của đội tuyển dụng..." />
              )}
            />
          </Form.Item>
        </SectionContainer>

        {customFieldDefs.length > 0 && (
          <SectionContainer style={{ marginBottom: 4 }}>
            <SectionHeader icon={<FormOutlined />} title="Thông tin bổ sung" subtitle="Các trường tùy chỉnh do công ty cấu hình" />
            <div style={grid3}>
              {customFieldDefs.map((def) => (
                <Form.Item key={def.fieldKey} label={def.fieldLabel}>
                  {def.fieldType === "NUMBER" ? (
                    <InputNumber
                      style={{ width: "100%" }}
                      value={customFieldValues[def.fieldKey] ? Number(customFieldValues[def.fieldKey]) : undefined}
                      onChange={(v) => setCustomFieldValues((prev) => ({ ...prev, [def.fieldKey]: v != null ? String(v) : "" }))}
                    />
                  ) : def.fieldType === "DATE" ? (
                    <DatePicker
                      style={{ width: "100%" }}
                      format="DD/MM/YYYY"
                      value={customFieldValues[def.fieldKey] ? dayjs(customFieldValues[def.fieldKey]) : null}
                      onChange={(date) => setCustomFieldValues((prev) => ({ ...prev, [def.fieldKey]: date ? date.format("YYYY-MM-DD") : "" }))}
                    />
                  ) : (
                    <Input
                      value={customFieldValues[def.fieldKey] ?? ""}
                      onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [def.fieldKey]: e.target.value }))}
                    />
                  )}
                </Form.Item>
              ))}
            </div>
          </SectionContainer>
        )}
      </Form>
    </Modal>
  );
}
