export type NotificationType =
    | "REQUISITION_PENDING_APPROVAL"
    | "APPLICATION_CREATED"
    | "APPLICATION_STAGE_CHANGED"
    | "APPLICATION_REJECTED"
    | "INTERVIEW_SCHEDULED"
    | "INTERVIEW_CONFIRMED"
    | "INTERVIEW_REMINDER"
    | "EVALUATION_INCOMPLETE_REMINDER"
    | "OFFER_PENDING_CONFIRMATION"
    | "OFFER_READY_FOR_CANDIDATE"
    | "OFFER_ACCEPTED"
    | "OFFER_DECLINED";

export type NotificationResourceType =
    | "REQUISITION"
    | "APPLICATION"
    | "INTERVIEW"
    | "OFFER"
    | string;

export interface NotificationResponse {
    id: number;
    type: NotificationType | string;
    title: string;
    message: string;
    resourceType: NotificationResourceType | null;
    resourceId: number | null;
    read: boolean;
    createdAt: string;
}