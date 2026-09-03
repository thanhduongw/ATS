# ATS Phase 9 - Refresh Token, Logout, Email Verification, Forgot Password

Date: 2026-08-31

## 1. Status And Scope

Phase 9 is **COMPLETED** for the single-company authentication lifecycle.

This phase implements server-side refresh-token rotation and revocation, backend
logout, candidate email activation, expiring one-time codes, and a non-enumerating
forgot-password response. It does not introduce tenant data or change the four-role
authorization model.

Implementation Status: **IMPLEMENTED**

Evidence:

- `auth-service/src/main/java/iuh/fit/se/auth/service/LoginService.java`
- `auth-service/src/main/java/iuh/fit/se/auth/service/RegisterService.java`
- `auth-service/src/main/java/iuh/fit/se/auth/service/PasswordService.java`
- `auth-service/src/main/resources/db/migration/V4__secure_auth_tokens.sql`

## 2. Refresh Token Lifecycle

On password or Google login, the backend generates a 32-byte cryptographically
random opaque refresh token. Only its SHA-256 digest is stored in the database; the
raw bearer token is returned once to the client. Refresh tokens expire after seven
days (`604800000` ms).

`POST /api/auth/refresh-token` hashes the submitted token and obtains a pessimistic
write lock on the matching row. A valid, unexpired, non-revoked token is revoked and
replaced with a new access/refresh pair in the same transaction. Reuse of the old
token is rejected. The lock serializes concurrent refresh attempts against the same
token.

The access token TTL remains 15 minutes (`900000` ms). Access JWTs are stateless and
are not persisted by Phase 9.

Implementation Status: **IMPLEMENTED**

Evidence:

- `auth-service/src/main/java/iuh/fit/se/auth/security/OpaqueTokenUtil.java`
- `auth-service/src/main/java/iuh/fit/se/auth/entity/RefreshToken.java`
- `auth-service/src/main/java/iuh/fit/se/auth/repository/RefreshTokenRepository.java#findForUpdateByTokenHash`
- `auth-service/src/main/java/iuh/fit/se/auth/service/LoginService.java#issueTokens`
- `auth-service/src/main/java/iuh/fit/se/auth/service/LoginService.java#refreshToken`
- `auth-service/src/main/resources/application.yml`

## 3. Logout

Logout now follows this flow:

```text
Frontend
  -> POST /api/auth/logout { refreshToken }
  -> backend hashes and locks the token row
  -> backend marks the refresh token revoked
  -> frontend clears Redux and localStorage in finally
  -> frontend redirects to /login
```

The logout endpoint is intentionally public at the gateway and auth security-chain
levels because the refresh token itself is the credential being revoked. This also
allows logout when the access JWT has expired. A missing, unknown, or already revoked
refresh token produces an idempotent successful logout without exposing token state.

Password reset and authenticated password change revoke every active refresh token
for the account.

Implementation Status: **IMPLEMENTED**

Evidence:

- endpoint: `POST /api/auth/logout`
- `auth-service/src/main/java/iuh/fit/se/auth/controller/AuthController.java#logout`
- `auth-service/src/main/java/iuh/fit/se/auth/service/LoginService.java#logout`
- `auth-service/src/main/java/iuh/fit/se/auth/repository/RefreshTokenRepository.java#revokeAllActiveByUserId`
- `api-gateway/src/main/java/iuh/fit/se/gateway/filter/JwtAuthGlobalFilter.java`
- `frontend/src/layouts/AppLayout.tsx#handleLogout`

## 4. Candidate Email Verification

Candidate registration creates an account with:

```text
role = CANDIDATE
status = PENDING_VERIFICATION
emailVerified = false
```

The six-digit OTP is generated using `SecureRandom`, stored only as a BCrypt hash,
and expires after 10 minutes. The latest OTP is authoritative. Verification uses a
pessimistic row lock, limits invalid attempts to five, and persists failed-attempt
counts even when the request returns a business error.

Only a pending candidate can complete this flow. Successful verification marks the
OTP verified and atomically changes the account to `ACTIVE` with
`emailVerified = true`. `LoginService.requireActive` rejects pending, inactive, and
locked users, so an unverified candidate cannot log in.

Resend behavior is generic for unknown, already verified, or ineligible accounts and
does not reveal whether an email is registered.

Implementation Status: **IMPLEMENTED**

Evidence:

- endpoints: `POST /api/auth/register`, `POST /api/auth/verify-email`, `POST /api/auth/resend-otp`
- `auth-service/src/main/java/iuh/fit/se/auth/service/RegisterService.java#registerCandidate`
- `auth-service/src/main/java/iuh/fit/se/auth/service/RegisterService.java#verifyEmail`
- `auth-service/src/main/java/iuh/fit/se/auth/service/RegisterService.java#resendOtp`
- `auth-service/src/main/java/iuh/fit/se/auth/entity/EmailVerification.java`
- `auth-service/src/main/java/iuh/fit/se/auth/repository/EmailVerificationRepository.java`
- `auth-service/src/main/java/iuh/fit/se/auth/service/LoginService.java#requireActive`

## 5. Forgot And Reset Password

`POST /api/auth/forgot-password` always returns the same successful response:

```text
If the email exists, a password reset OTP has been sent
```

No old password is sent. For an existing account, the backend generates a six-digit
`SecureRandom` OTP, stores only its BCrypt hash, and sets a 15-minute expiration.
Unknown addresses return normally and do not create a token.

`POST /api/auth/reset-password` accepts only the latest valid, unused OTP. It uses a
pessimistic lock, enforces a maximum of five invalid attempts, hashes the new password
with the configured BCrypt encoder, marks the reset token used, and revokes all
active refresh tokens for the account. Password inputs are constrained to 8-72
characters, matching BCrypt's input boundary.

Implementation Status: **IMPLEMENTED**

Evidence:

- endpoints: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `auth-service/src/main/java/iuh/fit/se/auth/controller/AuthController.java#forgotPassword`
- `auth-service/src/main/java/iuh/fit/se/auth/service/PasswordService.java#forgotPassword`
- `auth-service/src/main/java/iuh/fit/se/auth/service/PasswordService.java#resetPassword`
- `auth-service/src/main/java/iuh/fit/se/auth/entity/PasswordResetToken.java`
- `auth-service/src/main/java/iuh/fit/se/auth/repository/PasswordResetTokenRepository.java`
- `auth-service/src/main/java/iuh/fit/se/auth/dto/request/ResetPasswordRequest.java`

## 6. Frontend Integration

The existing Axios refresh queue continues to replace both tokens after a successful
rotation. Logout now calls the backend before clearing local state, while `finally`
guarantees local cleanup if the server is unavailable. Forgot-password and resend-OTP
screens show generic success messages. A successful password change signs the user
out because the backend has revoked that account's refresh sessions.

Implementation Status: **IMPLEMENTED**

Evidence:

- `frontend/src/services/axiosClient.ts`
- `frontend/src/features/auth/authApi.ts#logoutRequest`
- `frontend/src/layouts/AppLayout.tsx#handleLogout`
- `frontend/src/features/auth/pages/ForgotPasswordPage.tsx`
- `frontend/src/features/auth/pages/VerifyEmailPage.tsx`
- `frontend/src/features/auth/pages/ResetPasswordPage.tsx`
- `frontend/src/features/auth/pages/AuthManagementPage.tsx`

## 7. Database Migration

Migration `V4__secure_auth_tokens.sql` performs a deliberate one-time security
cutover:

- Revokes all pre-Phase-9 refresh tokens because those rows stored raw bearer values.
- Changes `refresh_token.token` to a 64-character SHA-256 digest column.
- Adds `failed_attempts` to email-verification and password-reset records.
- Expires legacy plaintext verification OTPs.
- Marks legacy plaintext password-reset OTPs used.

After deployment, existing users must log in again. Pending candidates must request a
new verification OTP, and unfinished password resets must be restarted.

Implementation Status: **IMPLEMENTED**

Evidence:

- `auth-service/src/main/resources/db/migration/V4__secure_auth_tokens.sql`
- `auth-service/src/main/java/iuh/fit/se/auth/entity/RefreshToken.java`
- `auth-service/src/main/java/iuh/fit/se/auth/entity/EmailVerification.java`
- `auth-service/src/main/java/iuh/fit/se/auth/entity/PasswordResetToken.java`

## 8. Verification

| Check | Result |
| --- | --- |
| Auth service tests | PASS, 31 tests, 0 failures/errors/skips |
| Gateway tests | PASS, 10 tests, 0 failures/errors/skips |
| Frontend production build | PASS (`npm run build`) |
| Frontend lint | PASS with 0 errors and 39 existing warnings |
| Plaintext token field/lookup scan | PASS, no matches |
| `git diff --check` | PASS; line-ending notices only |

Test coverage includes login token hashing, refresh rotation, refresh-token reuse
rejection, logout revocation/idempotency, inactive-account rejection, generic forgot
response, OTP hashing and expiry behavior, reset session revocation, candidate
activation, public logout gateway behavior, and storage-contract checks.

Evidence:

- `auth-service/src/test/java/iuh/fit/se/auth/service/LoginServiceTest.java`
- `auth-service/src/test/java/iuh/fit/se/auth/service/RegisterServiceTest.java`
- `auth-service/src/test/java/iuh/fit/se/auth/service/PasswordServiceTest.java`
- `auth-service/src/test/java/iuh/fit/se/auth/entity/Phase9TokenStorageContractTest.java`
- `auth-service/src/test/java/iuh/fit/se/auth/controller/AuthControllerTest.java`
- `auth-service/src/test/java/iuh/fit/se/auth/controller/AuthControllerSecurityTest.java`
- `api-gateway/src/test/java/iuh/fit/se/gateway/filter/JwtAuthGlobalFilterTest.java`

## 9. Acceptance Criteria

| Requirement | Status | Evidence |
| --- | --- | --- |
| Server-side refresh token | PASS | SHA-256 digest persisted in `refresh_token` |
| Rotation on refresh | PASS | old row revoked, new token pair issued |
| Logout revokes refresh token | PASS | revoked token cannot refresh again |
| Candidate cannot login before verification | PASS | `PENDING_VERIFICATION` rejected |
| Successful verification activates candidate | PASS | status and verification flag updated atomically |
| OTP/reset expiration | PASS | 10-minute verification, 15-minute reset |
| Forgot response does not reveal account existence | PASS | one generic response for all emails |
| New password is hashed | PASS | BCrypt `PasswordEncoder.encode` |

## 10. Security Boundary And Residual Risks

Phase 9 revokes refresh sessions but does not maintain an access-token blacklist.
Therefore, an access JWT already issued before logout or password reset remains valid
until its 15-minute expiry. This is the expected boundary of the current stateless JWT
design.

Refresh tokens remain in browser localStorage as established in Phase 8. Backend
hashing protects database disclosure, but localStorage still exposes tokens to a
successful same-origin XSS attack. Moving refresh tokens to Secure, HttpOnly,
SameSite cookies is a future hardening option and requires a coordinated CSRF design.

The generic forgot-password response prevents direct response-body enumeration, but
rate limiting and timing equalization are not implemented in this phase. Email
delivery failures do not print OTPs unless the explicit development setting
`MAIL_LOG_OTP_ON_FAILURE=true` is enabled.

Implementation Status: **PARTIALLY IMPLEMENTED (documented security boundary)**

Evidence:

- `auth-service/src/main/resources/application.yml`
- `auth-service/src/main/java/iuh/fit/se/auth/service/MailService.java`
- `frontend/src/features/auth/authSlice.ts`
- `frontend/src/services/axiosClient.ts`
