import axiosClient from "../../services/axiosClient";
import type {
    JobRequisitionResponse,
    JobRequisitionCreateRequest,
    JobRequisitionUpdateRequest,
    JobRequisitionRejectRequest,
    JobRequisitionApproveRequest,
    JobRequisitionRequestChangesRequest,
    JobPostingResponse,
    JobPostingCreateRequest,
    JobPostingUpdateRequest,
    JobPostingStatusRequest,
    PageResponse,
    RequisitionStatus,
    PostingStatus,
} from "./types";

// ===== Job Requisition =====
export const getRequisitions = (params?: {
    status?: RequisitionStatus;
    departmentId?: number;
    keyword?: string;
    assignedToMe?: boolean;
    page?: number;
    size?: number;
}) => axiosClient.get<PageResponse<JobRequisitionResponse>>("/recruitment/requisitions", { params });

export const getRequisitionById = (id: number) =>
    axiosClient.get<JobRequisitionResponse>(`/recruitment/requisitions/${id}`);

export const createRequisition = (data: JobRequisitionCreateRequest) =>
    axiosClient.post<JobRequisitionResponse>("/recruitment/requisitions", data);

export const updateRequisition = (id: number, data: JobRequisitionUpdateRequest) =>
    axiosClient.put<JobRequisitionResponse>(`/recruitment/requisitions/${id}`, data);

export const submitRequisition = (id: number) =>
    axiosClient.post<JobRequisitionResponse>(`/recruitment/requisitions/${id}/submit`);

export const approveRequisition = (id: number, data?: JobRequisitionApproveRequest) =>
    axiosClient.post<JobRequisitionResponse>(`/recruitment/requisitions/${id}/approve`, data ?? {});

export const rejectRequisition = (id: number, data: JobRequisitionRejectRequest) =>
    axiosClient.post<JobRequisitionResponse>(`/recruitment/requisitions/${id}/reject`, data);

export const requestRequisitionChanges = (id: number, data: JobRequisitionRequestChangesRequest) =>
    axiosClient.post<JobRequisitionResponse>(`/recruitment/requisitions/${id}/request-changes`, data);

// ===== Job Posting =====
export const getPostings = (params?: {
    status?: PostingStatus;
    employmentTypeId?: number;
    workLocationId?: number;
    keyword?: string;
    page?: number;
    size?: number;
}) => axiosClient.get<PageResponse<JobPostingResponse>>("/recruitment/postings", { params });

export const getPostingById = (id: number) =>
    axiosClient.get<JobPostingResponse>(`/recruitment/postings/${id}`);

export const createPosting = (data: JobPostingCreateRequest) =>
    axiosClient.post<JobPostingResponse>("/recruitment/postings", data);

export const updatePosting = (id: number, data: JobPostingUpdateRequest) =>
    axiosClient.put<JobPostingResponse>(`/recruitment/postings/${id}`, data);

export const changePostingStatus = (id: number, data: JobPostingStatusRequest) =>
    axiosClient.patch<JobPostingResponse>(`/recruitment/postings/${id}/status`, data);
/** Tin OPEN — Candidate (JobsPage) */
export const getOpenPostings = () =>
    axiosClient.get<JobPostingResponse[]>("/recruitment/postings/open");