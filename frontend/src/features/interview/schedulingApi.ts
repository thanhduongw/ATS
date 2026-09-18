import axiosClient from "../../services/axiosClient";
import type { SalaryProposalRequest, SalaryProposalResponse } from "./schedulingTypes";

// ===== Đề xuất lương (phòng ban → HR) =====
export const submitSalaryProposal = (data: SalaryProposalRequest) =>
    axiosClient.post<SalaryProposalResponse>("/interview/salary-proposals", data);

export const getSalaryProposals = (applicationId: number) =>
    axiosClient.get<SalaryProposalResponse[]>("/interview/salary-proposals", { params: { applicationId } });

export const approveSalaryProposal = (id: number) =>
    axiosClient.post<SalaryProposalResponse>(`/interview/salary-proposals/${id}/approve`);