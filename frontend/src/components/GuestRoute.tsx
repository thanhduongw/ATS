import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../app/hooks";

export default function GuestRoute() {
    const accessToken = useAppSelector((state) => state.auth.accessToken);
    return accessToken ? <Navigate to="/dashboard" replace /> : <Outlet />;
}