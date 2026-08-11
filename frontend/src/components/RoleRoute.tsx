import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import type { UserRole } from "../features/auth/types";

export default function RoleRoute({ allow }: { allow?: UserRole[] }) {
    const user = useAppSelector((s) => s.auth.user);
    if (!user) return <Navigate to="/login" replace />;
    if (allow && !allow.includes(user.role)) return <Navigate to="/dashboard" replace />;
    return <Outlet />;
}