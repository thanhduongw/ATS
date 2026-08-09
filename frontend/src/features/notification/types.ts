export type NotificationType =
    | "REQUISITION_PENDING_APPROVAL"
    | "INTERVIEW_SCHEDULED"
    | "INTERVIEW_REMINDER"
    | "OFFER_PENDING_CONFIRMATION"
    | "EVALUATION_INCOMPLETE_REMINDER";

export interface NotificationResponse {
    id: number;
    type: NotificationType;
    title: string;
    message: string;
    resourceType: string | null;
    resourceId: number | null;
    read: boolean;
    createdAt: string;
}