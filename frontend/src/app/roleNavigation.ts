import type { UserRole } from "../features/auth/types";

export function defaultRouteForRole(role: UserRole): string {
    return role === "CANDIDATE" ? "/jobs" : "/dashboard";
}
