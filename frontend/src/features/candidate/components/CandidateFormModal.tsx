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
      const axiosErr = err as AxiosError<ApiMessageResponse & { error?: string }>;
      const msg = axiosErr.response?.data?.message || axiosErr.response?.data?.error || axiosErr.message || "Thao tác thất bại";
      message.error(msg);
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
      destroyOnClose
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
