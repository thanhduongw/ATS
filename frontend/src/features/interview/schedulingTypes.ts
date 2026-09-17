export type SalaryProposalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface SalaryProposalResponse {
    id: number;
    applicationId: number;
    interviewId: number | null;
    proposedSalary: number;
    comment: string | null;
    proposedById: number;
    proposedByName: string;
    status: SalaryProposalStatus;
    createdAt: string;
}

export interface SalaryProposalRequest {
    applicationId: number;
    interviewId?: number | null;
    proposedSalary: number;
    comment?: string | null;
}