export interface AuditLogResponse {
    id: number;
    actorUserId: number;
    actorName: string;
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