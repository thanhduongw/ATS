import axiosClient from "../../services/axiosClient";
import type {
    InterviewSlotResponse, SlotBatchCreateRequest, SlotConfirmRequest,
    SalaryProposalRequest, SalaryProposalResponse,
} from "./schedulingTypes";
import type { InterviewResponse } from "./types";

// ===== Slots (3 bên xác nhận) =====
export const createSlots = (data: SlotBatchCreateRequest) =>
    axiosClient.post<InterviewSlotResponse[]>("/interview/slots/batch", data);

export const getSlots = (applicationId: number) =>
    axiosClient.get<InterviewSlotResponse[]>("/interview/slots", { params: { applicationId } });

/** Danh sách slot chờ XÁC NHẬN của user hiện tại (theo role: dept / candidate) */
export const getMyPendingSlots = () =>
    axiosClient.get<InterviewSlotResponse[]>("/interview/slots/my-pending");

export const confirmSlot = (id: number, data: SlotConfirmRequest) =>
    axiosClient.post<InterviewSlotResponse>(`/interview/slots/${id}/confirm`, data);

/** HR chốt slot → hệ thống tự động tạo Interview */
export const selectSlot = (id: number) =>
    axiosClient.post<InterviewResponse>(`/interview/slots/${id}/select`);

// ===== Đề xuất lương (phòng ban → HR) =====
export const submitSalaryProposal = (data: SalaryProposalRequest) =>
    axiosClient.post<SalaryProposalResponse>("/interview/salary-proposals", data);

export const getSalaryProposals = (applicationId: number) =>
    axiosClient.get<SalaryProposalResponse[]>("/interview/salary-proposals", { params: { applicationId } });

export const approveSalaryProposal = (id: number) =>
    axiosClient.post<SalaryProposalResponse>(`/interview/salary-proposals/${id}/approve`);