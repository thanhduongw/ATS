import type { InterviewFormat } from "./types";

export type SlotStatus = "PROPOSED" | "SELECTED" | "CANCELLED";

export interface InterviewSlotResponse {
    id: number;
    applicationId: number;
    candidateName: string;
    startTime: string;           // ISO
    endTime: string;
    format: InterviewFormat;
    location: string | null;
    meetingLink: string | null;
    status: SlotStatus;
    departmentConfirmed: boolean;
    candidateConfirmed: boolean;
    matched: boolean;            // cả 2 bên confirmed
}

export interface SlotBatchCreateRequest {
    applicationId: number;
    format: InterviewFormat;
    location?: string | null;
    meetingLink?: string | null;
    slots: { startTime: string; endTime: string }[];
}

export interface SlotConfirmRequest { available: boolean; }

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