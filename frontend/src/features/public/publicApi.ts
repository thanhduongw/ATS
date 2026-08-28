import axios from "axios";
import type {
    PublicCompanyResponse,
    PublicJobPosting,
    PublicApplyResponse,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

/** Client riêng cho public — không gắn JWT, không refresh token */
const publicClient = axios.create({
    baseURL: API_BASE_URL,
});

export const getPublicCompany = (tenantCode: string) =>
    publicClient.get<PublicCompanyResponse>(
        `/auth/public/companies/${encodeURIComponent(tenantCode)}`
    );

export const getPublicJobs = (
    tenantCode: string,
    params?: { employmentTypeId?: number; workLocationId?: number }
) =>
    publicClient.get<PublicJobPosting[]>(
        `/recruitment/public/companies/${encodeURIComponent(tenantCode)}/jobs`,
        { params }
    );

export const getPublicJobById = (tenantCode: string, jobId: number) =>
    publicClient.get<PublicJobPosting>(
        `/recruitment/public/companies/${encodeURIComponent(tenantCode)}/jobs/${jobId}`
    );

export const publicApply = (
    tenantCode: string,
    jobId: number,
    data: {
        fullName: string;
        email: string;
        phone?: string;
        note?: string;
        consentGiven: boolean;
        file: File;
    }
) => {
    const form = new FormData();
    form.append("fullName", data.fullName);
    form.append("email", data.email);
    if (data.phone) form.append("phone", data.phone);
    if (data.note) form.append("note", data.note);
    form.append("consentGiven", String(data.consentGiven));
    form.append("file", data.file);

    return publicClient.post<PublicApplyResponse>(
        `/application/public/companies/${encodeURIComponent(tenantCode)}/jobs/${jobId}/apply`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
    );
};