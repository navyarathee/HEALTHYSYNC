require('dotenv').config();
const pool = require('../config/db');

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Enum types ──────────────────────────────────────────
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('PATIENT', 'PROVIDER', 'ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE record_category AS ENUM ('PRESCRIPTION', 'LAB_RESULT', 'VISIT_NOTE');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ── Users table ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email           VARCHAR(255) UNIQUE NOT NULL,
        password_hash   VARCHAR(255) NOT NULL,
        role            user_role NOT NULL DEFAULT 'PATIENT',
        is_2fa_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Profiles table (one-to-one with users) ──────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id            UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        full_name          VARCHAR(255),
        date_of_birth      DATE,
        blood_group        VARCHAR(10),
        allergies          TEXT[] DEFAULT '{}',
        chronic_conditions TEXT[] DEFAULT '{}',
        emergency_contact  VARCHAR(255),
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Medical records table ───────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS medical_records (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title       VARCHAR(255) NOT NULL,
        category    record_category NOT NULL,
        file_url    VARCHAR(512) NOT NULL,
        uploaded_by UUID NOT NULL REFERENCES users(id),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ══════════════════════════════════════════════════════════
    // ══  PHASE 2 – Consent, Audit, 2FA  ═══════════════════
    // ══════════════════════════════════════════════════════════

    // ── Phase 2 Enum types ──────────────────────────────────
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE consent_access_level AS ENUM ('ALL_RECORDS', 'SPECIFIC_CATEGORY');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE consent_status AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE audit_action AS ENUM (
          'LOGIN', 'RECORD_VIEW', 'CONSENT_GRANT', 'CONSENT_REVOKE',
          'RECORD_UPLOAD', 'PROFILE_VIEW', 'PROFILE_UPDATE'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE access_reason AS ENUM ('TREATMENT', 'EMERGENCY', 'BILLING', 'RESEARCH', 'OTHER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── Consents table ──────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS consents (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_level consent_access_level NOT NULL DEFAULT 'ALL_RECORDS',
        category     record_category,
        status       consent_status NOT NULL DEFAULT 'ACTIVE',
        expires_at   TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(patient_id, provider_id)
      );
    `);

    // ── Audit logs table (append-only) ──────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID REFERENCES users(id),
        action        audit_action NOT NULL,
        resource_id   UUID,
        resource_type VARCHAR(100),
        access_reason access_reason,
        ip_address    VARCHAR(45),
        details       JSONB DEFAULT '{}',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Two-factor auth table ───────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS two_factor_auth (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        otp_hash   VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts   INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ══════════════════════════════════════════════════════════
    // ══  PHASE 3 – Appointments, Timeline, Streaming  ═══════
    // ══════════════════════════════════════════════════════════

    // ── Phase 3 Enum types ──────────────────────────────────
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE appointment_status AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE appointment_type AS ENUM ('FOLLOW_UP', 'CONSULTATION', 'EMERGENCY');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── Add new audit_action values ─────────────────────────
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'APPOINTMENT_CREATE';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'APPOINTMENT_UPDATE';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── Appointments table ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date_time           TIMESTAMPTZ NOT NULL,
        status              appointment_status NOT NULL DEFAULT 'PENDING',
        type                appointment_type NOT NULL DEFAULT 'CONSULTATION',
        notes               TEXT,
        teleconsult_link    VARCHAR(512),
        cancellation_reason TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Indexes for conflict detection & timeline perf ──────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_provider_datetime
        ON appointments (provider_id, date_time);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_patient_id
        ON appointments (patient_id);
    `);

    // ── Enhanced medical_records columns ─────────────────────
    // Add new columns only if they don't already exist
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE medical_records ADD COLUMN tags TEXT[] DEFAULT '{}';
      EXCEPTION WHEN duplicate_column THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE medical_records ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
      EXCEPTION WHEN duplicate_column THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE medical_records ADD COLUMN preview_thumbnail_url VARCHAR(512);
      EXCEPTION WHEN duplicate_column THEN NULL; END $$;
    `);

    // ══════════════════════════════════════════════════════════
    // ══  PHASE 4 – Clinical Security & Sync  ═════════════════
    // ══════════════════════════════════════════════════════════

    // ── Phase 4 Enum types ──────────────────────────────────
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE note_visibility AS ENUM ('INTERNAL', 'SHARED_WITH_PATIENT');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── Add new audit_action values ─────────────────────────
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'EMERGENCY_OVERRIDE';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'COLLAB_NOTE_CREATE';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'COLLAB_NOTE_VIEW';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'TELECONSULT_JOIN';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── Collaboration notes table ───────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS collaboration_notes (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        author_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content           TEXT NOT NULL,
        visibility        note_visibility NOT NULL DEFAULT 'INTERNAL',
        appointment_id    UUID REFERENCES appointments(id) ON DELETE SET NULL,
        is_telehealth_note BOOLEAN NOT NULL DEFAULT FALSE,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Indexes for collaboration notes ─────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_collab_notes_patient_id
        ON collaboration_notes (patient_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_collab_notes_author_id
        ON collaboration_notes (author_id);
    `);

    // ══════════════════════════════════════════════════════════
    // ══  PHASE 5 – System Hardening & Intelligence  ══════════
    // ══════════════════════════════════════════════════════════

    // ── Add new audit_action values ─────────────────────────
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'TOKEN_REFRESH';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'LOGOUT';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── Refresh tokens table (for token rotation) ───────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  VARCHAR(255) NOT NULL,
        family      UUID NOT NULL,
        is_revoked  BOOLEAN NOT NULL DEFAULT FALSE,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Indexes for refresh_tokens ──────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash
        ON refresh_tokens (token_hash);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
        ON refresh_tokens (user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family
        ON refresh_tokens (family);
    `);

    // ══════════════════════════════════════════════════════════
    // ══  PHASE 6 – Notifications, Provider Directory, Export ═
    // ══════════════════════════════════════════════════════════

    // ── Phase 6 Enum types ──────────────────────────────────
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM (
          'CONSENT_REQUEST', 'APPOINTMENT_REMINDER', 'APPOINTMENT_UPDATE',
          'SYSTEM_ALERT', 'RECORD_SHARED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── Notifications table ─────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type          notification_type NOT NULL,
        title         VARCHAR(255) NOT NULL,
        message       TEXT NOT NULL,
        is_read       BOOLEAN NOT NULL DEFAULT FALSE,
        reference_id  UUID,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Indexes for notifications ───────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id
        ON notifications (user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
        ON notifications (user_id, is_read) WHERE is_read = FALSE;
    `);

    // ── Performance indexes (Phase 6 optimization) ──────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id
        ON medical_records (patient_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
        ON audit_logs (user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
        ON audit_logs (created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_consents_patient_id
        ON consents (patient_id);
    `);

    // ══════════════════════════════════════════════════════════
    // ══  PHASE 7 – Patient & Provider Profile Expansion  ═════
    // ══════════════════════════════════════════════════════════

    // ── Patient profile fields ──────────────────────────────
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(20);`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(30);`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;`);

    // ── Provider profile fields ─────────────────────────────
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title VARCHAR(50);`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialization VARCHAR(100);`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255);`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department VARCHAR(100);`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_phone VARCHAR(30);`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_email VARCHAR(255);`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clinic_address TEXT;`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);`);

    // ══════════════════════════════════════════════════════════
    // ══  PHASE 8 – Admin Governance                     ══════
    // ══════════════════════════════════════════════════════════

    // ── Admin governance columns on profiles ────────────────
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'PENDING';`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_image_url VARCHAR(512);`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;`);

    // ── Add new audit_action values ─────────────────────────
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'USER_SUSPENDED';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'USER_UNSUSPENDED';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'VERIFICATION_APPROVED';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'VERIFICATION_REJECTED';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ADMIN_NOTE_ADDED';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'SYSTEM_BROADCAST';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'CREDENTIAL_EDIT';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── Add SYSTEM_BROADCAST to notification_type ───────────
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SYSTEM_BROADCAST';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── Suspension history table ────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS suspension_history (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action     VARCHAR(20) NOT NULL,
        reason     TEXT,
        admin_id   UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_suspension_history_user_id
        ON suspension_history (user_id);
    `);

    // ── Admin notes table (append-only, immutable) ──────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_notes (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        audit_log_id UUID NOT NULL REFERENCES audit_logs(id),
        admin_id     UUID NOT NULL REFERENCES users(id),
        note         TEXT NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_notes_audit_log_id
        ON admin_notes (audit_log_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully (Phase 1–8)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
