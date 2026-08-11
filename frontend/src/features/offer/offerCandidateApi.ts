import axiosClient from "../../services/axiosClient";
import type { OfferDeclineRequest, OfferResponse } from "./types";

export const getMyOffers = () => axiosClient.get<OfferResponse[]>("/offer/offers/my");
export const getOfferById = (id: number) => axiosClient.get<OfferResponse>(`/offer/offers/${id}`);
export const acceptOffer = (id: number) => axiosClient.post<OfferResponse>(`/offer/offers/${id}/accept`);
export const declineOffer = (id: number, data: OfferDeclineRequest) =>
    axiosClient.post<OfferResponse>(`/offer/offers/${id}/decline`, data);