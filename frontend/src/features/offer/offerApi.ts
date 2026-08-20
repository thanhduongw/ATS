import axiosClient from "../../services/axiosClient";
import type {
  OfferResponse,
  OfferCreateRequest,
  OfferUpdateRequest,
  OfferRejectRequest,
  OfferDeclineRequest,
  ApiMessageResponse,
  PageResponse,
  OfferStatus,
} from "./types";

export const getOffers = (params?: {
  applicationId?: number;
  status?: OfferStatus;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  size?: number;
}) => axiosClient.get<PageResponse<OfferResponse>>("/offer/offers", { params });

export const getOfferById = (id: number) =>
  axiosClient.get<OfferResponse>(`/offer/offers/${id}`);

export const createOffer = (data: OfferCreateRequest) =>
  axiosClient.post<OfferResponse>("/offer/offers", data);

export const updateOffer = (id: number, data: OfferUpdateRequest) =>
  axiosClient.put<OfferResponse>(`/offer/offers/${id}`, data);

export const submitOffer = (id: number) =>
  axiosClient.patch<OfferResponse>(`/offer/offers/${id}/submit`);

export const approveOffer = (id: number) =>
  axiosClient.patch<OfferResponse>(`/offer/offers/${id}/approve`);

export const rejectOffer = (id: number, data: OfferRejectRequest) =>
  axiosClient.patch<OfferResponse>(`/offer/offers/${id}/reject`, data);

export const acceptOffer = (id: number) =>
  axiosClient.patch<OfferResponse>(`/offer/offers/${id}/accept`);

export const declineOffer = (id: number, data: OfferDeclineRequest) =>
  axiosClient.patch<OfferResponse>(`/offer/offers/${id}/decline`, data);

export const deleteOffer = (id: number) =>
  axiosClient.delete<ApiMessageResponse>(`/offer/offers/${id}`);

export const getOfferPdf = (id: number) =>
  axiosClient.get<Blob>(`/offer/offers/${id}/pdf`, { responseType: "blob" });