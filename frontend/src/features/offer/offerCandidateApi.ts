import axiosClient from "../../services/axiosClient";
import type { OfferDeclineRequest, OfferResponse } from "./types";

export const getMyOffers = (applicationId?: number) =>
    axiosClient.get<OfferResponse[]>("/offer/offers", {
        params: applicationId ? { applicationId } : {},
    });

export const getOfferById = (id: number) =>
    axiosClient.get<OfferResponse>(`/offer/offers/${id}`);

export const acceptOffer = (id: number) =>
    axiosClient.patch<OfferResponse>(`/offer/offers/${id}/accept`);

export const declineOffer = (id: number, data: OfferDeclineRequest) =>
    axiosClient.patch<OfferResponse>(`/offer/offers/${id}/decline`, data);