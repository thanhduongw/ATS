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
