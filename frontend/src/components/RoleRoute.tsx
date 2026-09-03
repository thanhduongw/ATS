import { Navigate, Outlet, useOutletContext } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import type { UserRole } from "../features/auth/types";
import { defaultRouteForRole } from "../app/roleNavigation";

export default function RoleRoute({ allow }: { allow?: UserRole[] }) {
    const user = useAppSelector((s) => s.auth.user);
    const outletContext = useOutletContext();
    if (!user) return <Navigate to="/login" replace />;
    if (allow && !allow.includes(user.role)) {
        return <Navigate to={defaultRouteForRole(user.role)} replace />;
    }
    return <Outlet context={outletContext} />;
}
