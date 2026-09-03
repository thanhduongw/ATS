import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { defaultRouteForRole } from "../app/roleNavigation";

export default function GuestRoute() {
    const { accessToken, user } = useAppSelector((state) => state.auth);
    return accessToken && user
        ? <Navigate to={defaultRouteForRole(user.role)} replace />
        : <Outlet />;
}
