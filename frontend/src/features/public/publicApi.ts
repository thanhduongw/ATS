import axios from "axios";
import type { PublicCompanyResponse, PublicJobPosting } from "./types";
import { API_BASE_URL } from "../../config";

/** Public client: no JWT and no trusted identity headers. */
const publicClient = axios.create({ baseURL: API_BASE_URL });

export const getPublicCompany = () =>
    publicClient.get<PublicCompanyResponse>("/auth/public/company");

export const getPublicJobs = (
    params?: { employmentTypeId?: number; workLocationId?: number }
) => publicClient.get<PublicJobPosting[]>("/recruitment/public/jobs", { params });

export const getPublicJobById = (jobId: number) =>
    publicClient.get<PublicJobPosting>(`/recruitment/public/jobs/${jobId}`);
