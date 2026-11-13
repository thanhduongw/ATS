import axiosClient from "../../services/axiosClient";
import type { CandidateOfferResponse, OfferDeclineRequest } from "./types";

export const getMyOffers = (applicationId?: number) =>
    axiosClient.get<CandidateOfferResponse[]>("/offer/offers/my")
        .then((response) => ({
            ...response,
            data: applicationId
                ? response.data.filter((offer) => offer.applicationId === applicationId)
                : response.data,
        }));

/** C16 · Thư mời PDF của chính ứng viên (backend `assertCanView`: đúng chủ thư, thư đã gửi). */
export const getMyOfferPdf = (id: number) =>
    axiosClient.get<Blob>(`/offer/offers/${id}/pdf`, { responseType: "blob" });

export const getOfferById = (id: number) =>
    axiosClient.get<CandidateOfferResponse>(`/offer/offers/my/${id}`);

export const acceptOffer = (id: number) =>
    axiosClient.patch<CandidateOfferResponse>(`/offer/offers/${id}/accept`);

export const declineOffer = (id: number, data: OfferDeclineRequest) =>
    axiosClient.patch<CandidateOfferResponse>(`/offer/offers/${id}/decline`, data);
