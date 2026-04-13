# HealthSync API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a `Bearer` token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

Refresh tokens are sent/received via HttpOnly cookies (`refreshToken`).

---

## 1. Auth Endpoints

### POST `/auth/register`
Create a new user account.

**Body:**
```json
{
  "email": "patient@example.com",
  "password": "securepass123",
  "role": "PATIENT"
}
```
**Roles:** `PATIENT`, `PROVIDER`, `ADMIN`

**Response:** `201`
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": { "id": "uuid", "email": "...", "role": "PATIENT" }
}
```

---

### POST `/auth/login`
Authenticate a user. Returns tokens or triggers 2FA.

**Body:**
```json
{
  "email": "patient@example.com",
  "password": "securepass123"
}
```

**Response (no 2FA):** `200`
```json
{
  "success": true,
  "accessToken": "jwt...",
  "user": { "id": "uuid", "email": "...", "role": "PATIENT" }
}
```

**Response (2FA enabled):** `200`
```json
{
  "partial_success": true,
  "message": "OTP sent to your email",
  "temp2FAToken": "jwt..."
}
```

---

### POST `/auth/2fa/verify`
Verify OTP for 2FA login.

**Body:**
```json
{
  "tempToken": "jwt...",
  "otp": "123456"
}
```

---

### POST `/auth/2fa/enable`
Enable 2FA on the authenticated user's account. *Requires auth.*

---

### POST `/auth/2fa/disable`
Disable 2FA. *Requires auth.*

---

### POST `/auth/change-password`
Change the authenticated user's password. *Requires auth.*

**Body:**
```json
{
  "currentPassword": "oldpass",
  "newPassword": "newpassword123"
}
```

---

### POST `/auth/refresh`
Rotate the refresh token and get a new access token. Uses the HttpOnly `refreshToken` cookie.

---

### POST `/auth/logout`
Logout and invalidate the current refresh token family. *Requires auth.*

---

## 2. Profile Endpoints

### GET `/profile`
Get the patient's medical profile. *PATIENT only.*

### PATCH `/profile`
Update profile fields (full_name, blood_group, allergies, etc.). *PATIENT or PROVIDER.*

**Body:**
```json
{
  "full_name": "John Doe",
  "blood_group": "O+",
  "allergies": "Penicillin",
  "chronic_conditions": "Hypertension",
  "emergency_contact": "+1234567890"
}
```

### GET `/profile/export`
Download all patient data as JSON. *PATIENT only.*

### GET `/profile/my-logs`
View audit logs of who accessed this patient's data. *PATIENT only.*

---

## 3. Records Endpoints

### POST `/records`
Upload a medical record. *PATIENT or PROVIDER.*

**Content-Type:** `multipart/form-data`
- `title` (string, required)
- `category` (string: `PRESCRIPTION`, `LAB_RESULT`, `VISIT_NOTE`)
- `file` (file, required — PDF, JPG, PNG, max 5MB)

### GET `/records`
List own records. Optional query: `?includeArchived=true`

### GET `/records/:patientId`
View a specific patient's records. *Requires consent.* Triggers audit log.

### GET `/records/:id/stream`
Stream/preview a record file. *Requires consent.*

### PATCH `/records/:id/archive`
Soft-delete a record. *PATIENT only.*

### PATCH `/records/:id/restore`
Restore an archived record. *PATIENT only.*

---

## 4. Consent Endpoints

### GET `/consent/active`
List all active consents. *PATIENT only.*

### POST `/consent/grant`
Grant a provider access to records.

**Body:**
```json
{
  "providerId": "uuid",
  "accessLevel": "ALL_RECORDS",
  "category": "PRESCRIPTION",
  "expiresInDays": 30
}
```
**Access levels:** `ALL_RECORDS`, `SPECIFIC_CATEGORY`

### DELETE `/consent/revoke/:id`
Revoke a consent. *PATIENT only.*

---

## 5. Appointments Endpoints

### GET `/appointments`
List appointments for the authenticated user.

### POST `/appointments`
Create an appointment. *PATIENT only.*

**Body:**
```json
{
  "providerId": "uuid",
  "dateTime": "2026-01-15T10:00:00Z",
  "type": "CONSULTATION",
  "notes": "Follow-up visit"
}
```

### PATCH `/appointments/:id/status`
Update appointment status. *PROVIDER or ADMIN.*

**Body:**
```json
{ "status": "CONFIRMED" }
```
**Statuses:** `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`

### PATCH `/appointments/:id/reschedule`
Reschedule an appointment.

**Body:**
```json
{ "dateTime": "2026-01-20T14:00:00Z" }
```

### GET `/appointments/join/:id`
Join a teleconsult session for an appointment.

---

## 6. Collaboration Notes

### GET `/collab/notes`
List collaboration notes visible to the authenticated user.

### POST `/collab/notes`
Create a case discussion note. *PROVIDER only.*

**Body:**
```json
{
  "patientId": "uuid",
  "content": "Patient showing improvement...",
  "category": "CLINICAL"
}
```

---

## 7. Notifications

### GET `/notifications`
List notifications (paginated). Query: `?limit=20&offset=0`

### GET `/notifications/unread-count`
Get count of unread notifications.

### PATCH `/notifications/:id/read`
Mark a single notification as read.

### PATCH `/notifications/read-all`
Mark all notifications as read.

---

## 8. Provider Search

### GET `/providers/search`
Search providers by name or email. *PATIENT only.*

Query: `?q=dr+smith`

---

## 9. Audit Endpoints

### GET `/audit/me`
View own audit log (patients). Query: `?page=1&limit=20`

### GET `/audit/logs`
View all audit logs. *ADMIN only.*

---

## 10. Admin Endpoints

### GET `/admin/system-health`
System health metrics: user counts, consent velocity, override frequency. *ADMIN only.*

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

| Status | Meaning |
|---|---|
| 400 | Bad request / validation error |
| 401 | Unauthorized / invalid token |
| 403 | Forbidden / insufficient role |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
