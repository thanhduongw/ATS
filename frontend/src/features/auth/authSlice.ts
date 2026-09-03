import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";
import type { AuthUser, JwtPayload, LoginResponse, UserProfileResponse } from "./types";

const STORAGE_KEY = "ats_auth";
const SUPPORTED_ROLES = new Set(["COMPANY_ADMIN", "RECRUITER", "HIRING_MANAGER", "CANDIDATE"]);

export interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    user: AuthUser | null;
}

const loadFromStorage = (): AuthState | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as AuthState;
        if (!parsed.accessToken) return null;
        const decoded = jwtDecode<JwtPayload>(parsed.accessToken);
        if (!SUPPORTED_ROLES.has(decoded.role) || !decoded.sub || !decoded.email) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
        return {
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken,
            user: {
                userId: decoded.sub,
                email: decoded.email,
                role: decoded.role,
                departmentId: decoded.departmentId ?? null,
                fullName: parsed.user?.fullName,
            },
        };
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
};

const stored = loadFromStorage();

const initialState: AuthState = {
    accessToken: stored?.accessToken ?? null,
    refreshToken: stored?.refreshToken ?? null,
    user: stored?.user ?? null,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setCredentials: (state, action: PayloadAction<LoginResponse>) => {
            const { accessToken, refreshToken } = action.payload;
            const decoded = jwtDecode<JwtPayload>(accessToken);

            state.accessToken = accessToken;
            state.refreshToken = refreshToken;
            state.user = {
                userId: decoded.sub,
                email: decoded.email,
                role: decoded.role,
                departmentId: decoded.departmentId ?? null,
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        },
        logout: (state) => {
            state.accessToken = null;
            state.refreshToken = null;
            state.user = null;
            localStorage.removeItem(STORAGE_KEY);
        },
        setUserProfile: (state, action: PayloadAction<UserProfileResponse>) => {
            if (!state.user) return;
            state.user.fullName = action.payload.fullName;
            state.user.email = action.payload.email;
            state.user.departmentId = action.payload.departmentId;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        },
    },
});

export const { setCredentials, logout, setUserProfile } = authSlice.actions;
export default authSlice.reducer;
