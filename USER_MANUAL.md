# HealthSync User Manual

## Getting Started

HealthSync is a healthcare data management platform with three user roles:
- **Patient** — Upload records, control access, view timeline
- **Provider** — Access patient records (with consent), manage appointments
- **Admin** — Monitor system health and user activity

---

## 1. Registration & Login

### Creating an Account
1. Navigate to the **Register** page
2. Enter your email, password, and select your role (Patient, Provider, or Admin)
3. Click **Create Account**

### Logging In
1. Enter your email and password on the **Login** page
2. If 2FA is enabled, you'll receive a 6-digit OTP code — enter it to complete login

---

## 2. Patient Guide

### Managing Your Profile
1. Go to **My Profile** from the sidebar
2. Fill in your medical details: full name, date of birth, blood group, allergies, chronic conditions, and emergency contact
3. Click **Save Changes**

### Uploading Medical Records
1. Go to **My Records** from the sidebar
2. Click **➕ Upload Record**
3. Enter a title, select a category (Prescription, Lab Result, or Visit Note)
4. Drop or select your file (PDF, JPG, or PNG — max 5MB)
5. Click **📤 Upload**

### Archiving Records
- Click **📦 Archive** on any record to soft-delete it
- Toggle **Show archived records** to see archived items
- Click **↩️ Restore** to bring an archived record back

### Granting Access to a Provider
1. Go to **Consent** from the sidebar
2. Click **➕ Authorize Provider**
3. Select a provider, choose access level, optionally set an expiry
4. Click **🔓 Grant Access**

### Finding New Providers
1. Go to **Find Providers** from the sidebar
2. Search by name or email
3. Click **🔓 Grant Access** directly from the search results

### Revoking Access
1. Go to **Consent** from the sidebar
2. Find the provider's consent card
3. Click **Revoke Access** — this takes effect immediately

### Viewing Your Activity Log
1. Go to **Activity Log** from the sidebar
2. See a timeline of every action taken on your data — who viewed, when, and why

### Exporting Your Data
1. Go to **Security** from the sidebar
2. Scroll to the **Export Your Data** section
3. Click **📥 Download My Data** — a JSON file downloads with all your data

---

## 3. Provider Guide

### Accessing Patient Records
1. A patient must first **grant you access** via the Consent page
2. Once authorized, patient records appear in **Patient Records**
3. Click **👁️ View** to preview any record

### Emergency Override
If you need urgent access to a patient's records without prior consent:
1. The system will prompt for an **emergency reason**
2. Your access is logged and flagged for review
3. The patient will see this override in their Activity Log

### Creating Case Discussion Notes
1. Go to **Case Discussion** from the sidebar
2. Click **➕ New Note**
3. Select a patient, write your clinical notes
4. Other authorized providers can view and discuss

### Managing Appointments
1. Go to **Appointments** from the sidebar
2. Confirm, reschedule, or cancel appointments as needed

---

## 4. Security Features

### Enabling Two-Factor Authentication (2FA)
1. Go to **Security** from the sidebar
2. Click **🔒 Enable 2FA**
3. On your next login, you'll need to enter a 6-digit OTP code from your email

### Disabling 2FA
1. Go to **Security** → Click **🔓 Disable 2FA**
2. Confirm in the modal dialog

### Changing Your Password
1. Go to **Security** from the sidebar
2. Scroll to **Change Password**
3. Enter your current password, then your new password twice
4. Click **🔄 Update Password**

---

## 5. Notifications

- The **🔔 bell icon** in the header shows your unread count
- Click it to see a quick preview of recent notifications
- Click **View All Notifications** or go to **Notifications** in the sidebar for the full history
- Click any unread notification to mark it as read
- Use **✓ Mark All Read** to clear all at once

---

## 6. Admin Guide

### System Health Dashboard
1. Go to **System Health** from the sidebar
2. View summary metrics: total users, active consents, recent overrides
3. Monitor consent velocity and emergency access patterns

---

## FAQ

**Q: Is my data encrypted?**
A: Passwords are hashed with bcrypt. Access tokens are short-lived (15 min). Refresh tokens are HttpOnly cookies that rotate on every use.

**Q: Can I see who accessed my records?**
A: Yes! Go to **Activity Log** — every access is immutably logged with the actor, action, and timestamp.

**Q: What happens if I revoke a provider's access?**
A: They lose all access immediately. The revocation is logged in the audit trail.

**Q: Can I get all my data back?**
A: Yes — go to **Security → Export Your Data** to download everything as a JSON file.
