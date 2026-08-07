import { useCallback, useEffect, useState } from "react";
import { Table, Tag, Button, Segmented, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { getOffers } from "../offerApi";
import type { ApiMessageResponse, OfferResponse, OfferStatus } from "../types";
import OfferDetailDrawer from "./OfferDetailDrawer";

const STATUS_LABEL: Record<string, string> = {
  ALL: "Tất cả",
  DRAFT: "Bản nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối duyệt",
  ACCEPTED: "Đã chấp nhận",
  DECLINED: "Ứng viên từ chối",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  PENDING_APPROVAL: "warning",
  APPROVED: "processing",
  REJECTED: "error",
  ACCEPTED: "success",
  DECLINED: "magenta",
};

export default function OffersList() {
  const [offers, setOffers] = useState<OfferResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedOffer, setSelectedOffer] = useState<OfferResponse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOffers();
      setOffers(res.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiMessageResponse>;
      message.error(axiosErr.response?.data?.message ?? "Không tải được danh sách Offer");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const displayed = offers.filter((o) => (filterStatus === "ALL" ? true : o.status === filterStatus));

  const columns: ColumnsType<OfferResponse> = [
    {
      title: "Ứng viên",
      dataIndex: "candidateName",
      key: "candidateName",
    },
    {
      title: "Mức lương đề nghị",
      dataIndex: "salaryOffered",
      key: "salaryOffered",
      render: (val: number) => `${val.toLocaleString("vi-VN")} VND`,
    },
    {
      title: "Loại hợp đồng",
      dataIndex: "contractTypeName",
      key: "contractTypeName",
    },
    {
      title: "Ngày bắt đầu",
      dataIndex: "startDate",
      key: "startDate",
      render: (val: string) => dayjs(val).format("DD/MM/YYYY"),
    },
    {
      title: "Người tạo",
      dataIndex: "requesterName",
      key: "requesterName",
    },
    {
      title: "Người duyệt",
      dataIndex: "approverName",
      key: "approverName",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: OfferStatus) => (
        <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status] ?? status}</Tag>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedOffer(record);
            setDrawerOpen(true);
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Segmented
        value={filterStatus}
        onChange={(v) => setFilterStatus(v as string)}
        options={Object.keys(STATUS_LABEL).map((k) => ({ label: STATUS_LABEL[k], value: k }))}
        style={{ marginBottom: 16 }}
      />

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={displayed}
        pagination={{ pageSize: 10 }}
      />

      <OfferDetailDrawer
        open={drawerOpen}
        offer={selectedOffer}
        onClose={() => setDrawerOpen(false)}
        onChanged={loadOffers}
      />
    </div>
  );
}
