import axiosClient from "../../services/axiosClient";
import type {
  OfferResponse,
  OfferCreateRequest,
  OfferUpdateRequest,
  OfferRejectRequest,
  OfferDeclineRequest,
  ApiMessageResponse,
} from "./types";

export const getOffers = (applicationId?: number) =>
  axiosClient.get<OfferResponse[]>("/candidate/offers", {
    params: applicationId ? { applicationId } : {},
  });

export const getOfferById = (id: number) =>
  axiosClient.get<OfferResponse>(`/candidate/offers/${id}`);

export const createOffer = (data: OfferCreateRequest) =>
  axiosClient.post<OfferResponse>("/candidate/offers", data);

export const updateOffer = (id: number, data: OfferUpdateRequest) =>
  axiosClient.put<OfferResponse>(`/candidate/offers/${id}`, data);

export const submitOffer = (id: number) =>
  axiosClient.post<OfferResponse>(`/candidate/offers/${id}/submit`);

export const approveOffer = (id: number) =>
  axiosClient.post<OfferResponse>(`/candidate/offers/${id}/approve`);

export const rejectOffer = (id: number, data: OfferRejectRequest) =>
  axiosClient.post<OfferResponse>(`/candidate/offers/${id}/reject`, data);

export const acceptOffer = (id: number) =>
  axiosClient.post<OfferResponse>(`/candidate/offers/${id}/accept`);

export const declineOffer = (id: number, data: OfferDeclineRequest) =>
  axiosClient.post<OfferResponse>(`/candidate/offers/${id}/decline`, data);

export const deleteOffer = (id: number) =>
  axiosClient.delete<ApiMessageResponse>(`/candidate/offers/${id}`);
