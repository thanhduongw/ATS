import axiosClient from "../../services/axiosClient";
import type {
    CatalogItem,
    ApiMessageResponse,
    PipelineRequest,
    PipelineResponse,
} from "./types";

// ===== Generic catalog API — dùng chung cho 12 danh mục đơn giản + Email Template =====
export const getCatalogItems = (endpoint: string) =>
    axiosClient.get<CatalogItem[]>(endpoint);

export const createCatalogItem = (endpoint: string, data: Record<string, unknown>) =>
    axiosClient.post<CatalogItem>(endpoint, data);

export const updateCatalogItem = (endpoint: string, id: number, data: Record<string, unknown>) =>
    axiosClient.put<CatalogItem>(`${endpoint}/${id}`, data);

export const deleteCatalogItem = (endpoint: string, id: number) =>
    axiosClient.delete<ApiMessageResponse>(`${endpoint}/${id}`);

// ===== Pipeline API — cấu trúc lồng nhau (có mảng stages), không dùng chung generic =====
export const getPipelines = () =>
    axiosClient.get<PipelineResponse[]>("/masterdata/pipelines");

export const createPipeline = (data: PipelineRequest) =>
    axiosClient.post<PipelineResponse>("/masterdata/pipelines", data);

export const updatePipeline = (id: number, data: PipelineRequest) =>
    axiosClient.put<PipelineResponse>(`/masterdata/pipelines/${id}`, data);

export const deletePipeline = (id: number) =>
    axiosClient.delete<ApiMessageResponse>(`/masterdata/pipelines/${id}`);