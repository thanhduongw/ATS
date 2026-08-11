import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { App, Button, Card, Col, Descriptions, Input, Modal, Row, Select, Statistic, Tag } from "antd";
import { CheckCircleTwoTone, CloseCircleTwoTone } from "@ant-design/icons";
import dayjs from "dayjs";
import { acceptOffer, declineOffer, getOfferById } from "../offerCandidateApi";
import type { OfferResponse } from "../types";
import { useI18n } from "../../../i18n/I18nProvider";

export default function OfferCandidateViewPage() {
    const { id } = useParams();
    const { message } = App.useApp();
    const { t } = useI18n();
    const [offer, setOffer] = useState<OfferResponse | null>(null);
    const [declineOpen, setDeclineOpen] = useState(false);
    const [note, setNote] = useState("");

    const load = () => getOfferById(Number(id)).then((r) => setOffer(r.data));
    useEffect(() => {
        load();
    }, [id]);

    const pending = offer?.status === "APPROVED"; // đã HR chốt, chờ ứng viên

    return (
        <Card title="Offer" style={{ maxWidth: 760, margin: "0 auto" }}>
            {offer && (<>
                <Descriptions bordered size="small" column={1} items={[
                    { key: "c", label: "Candidate", children: offer.candidateName },
                    {
                        key: "s", label: t("offer.salary"),
                        children: <b style={{ color: "#0E7A5F" }}>{offer.salaryOffered.toLocaleString("vi-VN")} VND</b>
                    },
                    { key: "b", label: t("offer.benefits"), children: offer.benefits ?? "-" },
                    { key: "a", label: "Allowance", children: offer.allowance?.toLocaleString("vi-VN") ?? "-" },
                    { key: "d", label: t("offer.startDate"), children: dayjs(offer.startDate).format("DD/MM/YYYY") },
                    { key: "p", label: t("offer.probation"), children: `${offer.probationMonths} ${t("offer.months")}` },
                ]} />

                {pending && offer.responseDeadline && (
                    <Row justify="center" style={{ margin: "20px 0" }}>
                        <Statistic.Countdown title={t("offer.deadline")}
                            value={dayjs(offer.responseDeadline).valueOf()} />
                    </Row>
                )}

                {pending && (
                    <Row gutter={16} justify="center">
                        <Col><Button size="large" type="primary" icon={<CheckCircleTwoTone twoToneColor="#52c41a" />}
                            onClick={async () => { await acceptOffer(offer.id); message.success("🎉"); load(); }}>
                            {t("offer.accept")}
                        </Button></Col>
                        <Col><Button size="large" danger icon={<CloseCircleTwoTone twoToneColor="#ff4d4f" />}
                            onClick={() => setDeclineOpen(true)}>
                            {t("offer.decline")}
                        </Button></Col>
                    </Row>
                )}
                {!pending && <Tag color={offer.status === "ACCEPTED" ? "green" : "red"}>{offer.status}</Tag>}
            </>)}

            <Modal open={declineOpen} title={t("offer.decline")} okText="Send"
                onOk={async () => {
                    await declineOffer(offer!.id, { declineReasonId: 1, note });
                    setDeclineOpen(false); load();
                }}>
                <Select style={{ width: "100%", marginBottom: 8 }} placeholder="Reason"
                    options={[{ value: 1, label: "Không phù hợp mức lương" },
                    { value: 2, label: "Không phù hợp thời gian" },
                    { value: 3, label: "Lý do khác" }]} />
                <Input.TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </Modal>
        </Card>
    );
}