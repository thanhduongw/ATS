export interface AuditLogResponse {
    id: number;
    actorUserId: number;
    /** null khi là hệ thống, hoặc khi API không trả tên (lịch sử theo đối tượng). */
    actorName: string | null;
    action: string;
    resourceType: string | null;
    resourceId: number | null;
    metadata: string | null;
    createdAt: string;
}

export interface AuditLogSearchParams {
    resourceType?: string;
    actorUserId?: number;
    from?: string;
    to?: string;
}