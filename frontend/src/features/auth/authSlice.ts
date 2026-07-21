import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";
import type { AuthUser, JwtPayload, LoginResponse } from "./types";

const STORAGE_KEY = "ats_auth";

export interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    user: AuthUser | null;
}

const loadFromStorage = (): AuthState | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as AuthState) : null;
    } catch {
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
                tenantId: decoded.tenantId,
                role: decoded.role,
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        },
        logout: (state) => {
            state.accessToken = null;
            state.refreshToken = null;
            state.user = null;
            localStorage.removeItem(STORAGE_KEY);
        },
    },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;