import axiosClient from "../../services/axiosClient";
import type {
    JobRequisitionResponse,
    JobRequisitionCreateRequest,
    JobRequisitionUpdateRequest,
    JobRequisitionRejectRequest,
    JobPostingResponse,
    JobPostingCreateRequest,
    JobPostingUpdateRequest,
    JobPostingStatusRequest,
} from "./types";

// ===== Job Requisition =====
export const getRequisitions = () =>
    axiosClient.get<JobRequisitionResponse[]>("/recruitment/requisitions");

export const getRequisitionById = (id: number) =>
    axiosClient.get<JobRequisitionResponse>(`/recruitment/requisitions/${id}`);

export const createRequisition = (data: JobRequisitionCreateRequest) =>
    axiosClient.post<JobRequisitionResponse>("/recruitment/requisitions", data);

export const updateRequisition = (id: number, data: JobRequisitionUpdateRequest) =>
    axiosClient.put<JobRequisitionResponse>(`/recruitment/requisitions/${id}`, data);

export const submitRequisition = (id: number) =>
    axiosClient.post<JobRequisitionResponse>(`/recruitment/requisitions/${id}/submit`);

export const approveRequisition = (id: number) =>
    axiosClient.post<JobRequisitionResponse>(`/recruitment/requisitions/${id}/approve`);

export const rejectRequisition = (id: number, data: JobRequisitionRejectRequest) =>
    axiosClient.post<JobRequisitionResponse>(`/recruitment/requisitions/${id}/reject`, data);

// ===== Job Posting =====
export const getPostings = () =>
    axiosClient.get<JobPostingResponse[]>("/recruitment/postings");

export const getPostingById = (id: number) =>
    axiosClient.get<JobPostingResponse>(`/recruitment/postings/${id}`);

export const createPosting = (data: JobPostingCreateRequest) =>
    axiosClient.post<JobPostingResponse>("/recruitment/postings", data);

export const updatePosting = (id: number, data: JobPostingUpdateRequest) =>
    axiosClient.put<JobPostingResponse>(`/recruitment/postings/${id}`, data);

export const changePostingStatus = (id: number, data: JobPostingStatusRequest) =>
    axiosClient.patch<JobPostingResponse>(`/recruitment/postings/${id}/status`, data);