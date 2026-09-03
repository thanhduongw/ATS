import { Navigate } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { defaultRouteForRole } from "../app/roleNavigation";

export default function RoleHomeRedirect() {
    const user = useAppSelector((state) => state.auth.user);
    return <Navigate to={user ? defaultRouteForRole(user.role) : "/login"} replace />;
}
