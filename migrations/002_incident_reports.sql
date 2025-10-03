-- Migration: Incident Reports System
-- Description: Creates tables for incident reporting with encryption, audit logging, and RBAC
-- Version: 002
-- Date: 2025-01-XX

-- ============================================================================
-- 1. INCIDENT REPORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS incident_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'submitted', 'under_review', 'resolved', 'archived')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    last_modified_by VARCHAR(255),
    
    -- Incident Details
    incident_date DATE NOT NULL,
    incident_time TIME NOT NULL,
    reported_date DATE NOT NULL,
    location VARCHAR(255) NOT NULL,
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN (
        'behavioral', 'medical', 'safety', 'property_damage', 
        'runaway', 'self_harm', 'aggression', 'substance_use', 'other'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('minor', 'moderate', 'serious', 'critical')),
    
    -- Youth Information (PII - encrypted)
    youth_id VARCHAR(255), -- Reference to youth profile
    youth_name_encrypted TEXT NOT NULL, -- Encrypted youth name
    youth_age INTEGER,
    youth_dob_encrypted TEXT, -- Encrypted DOB
    youth_ssn_hash VARCHAR(64), -- SHA-256 hash of SSN (never store plain SSN)
    
    -- Incident Description
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    antecedents TEXT,
    behavior TEXT,
    consequences TEXT,
    
    -- People Involved (stored as JSONB for flexibility)
    staff_involved JSONB NOT NULL DEFAULT '[]'::JSONB,
    witnesses JSONB NOT NULL DEFAULT '[]'::JSONB,
    others_involved JSONB DEFAULT '[]'::JSONB,
    
    -- Actions Taken
    immediate_actions JSONB NOT NULL DEFAULT '[]'::JSONB,
    interventions_used JSONB DEFAULT '[]'::JSONB,
    medical_attention_required BOOLEAN NOT NULL DEFAULT FALSE,
    medical_details_encrypted TEXT, -- Encrypted medical information
    
    -- Notifications
    parents_notified BOOLEAN NOT NULL DEFAULT FALSE,
    parents_notified_at TIMESTAMP WITH TIME ZONE,
    parents_notified_by VARCHAR(255),
    authorities_notified BOOLEAN NOT NULL DEFAULT FALSE,
    authorities_notified_details TEXT,
    
    -- Attachments & Evidence
    attachments JSONB NOT NULL DEFAULT '[]'::JSONB,
    photos_taken BOOLEAN NOT NULL DEFAULT FALSE,
    video_recorded BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Signatures
    signatures JSONB NOT NULL DEFAULT '[]'::JSONB,
    
    -- Follow-up
    follow_up JSONB NOT NULL,
    
    -- Additional Notes
    additional_notes TEXT,
    
    -- Privacy & Security
    encrypted_fields JSONB DEFAULT '[]'::JSONB,
    encryption_key_version INTEGER DEFAULT 1,
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by VARCHAR(255),
    
    -- Indexes for common queries
    CONSTRAINT incident_reports_created_by_check CHECK (created_by <> ''),
    CONSTRAINT incident_reports_youth_name_check CHECK (youth_name_encrypted <> '')
);

-- Create indexes for performance
CREATE INDEX idx_incident_reports_status ON incident_reports(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_reports_incident_date ON incident_reports(incident_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_reports_incident_type ON incident_reports(incident_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_reports_severity ON incident_reports(severity) WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_reports_youth_id ON incident_reports(youth_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_reports_created_by ON incident_reports(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_reports_created_at ON incident_reports(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_reports_incident_number ON incident_reports(incident_number) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_incident_reports_search ON incident_reports USING gin(
    to_tsvector('english', 
        COALESCE(summary, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(location, '')
    )
) WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. INCIDENT AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS incident_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'created', 'updated', 'viewed', 'exported', 'deleted', 'status_changed'
    )),
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    changes JSONB, -- What changed (before/after values)
    export_type VARCHAR(20) CHECK (export_type IN ('full', 'anonymized')),
    
    -- Index for querying audit logs
    CONSTRAINT audit_logs_performed_by_check CHECK (performed_by <> '')
);

CREATE INDEX idx_incident_audit_logs_incident_id ON incident_audit_logs(incident_id);
CREATE INDEX idx_incident_audit_logs_performed_at ON incident_audit_logs(performed_at DESC);
CREATE INDEX idx_incident_audit_logs_action ON incident_audit_logs(action);
CREATE INDEX idx_incident_audit_logs_performed_by ON incident_audit_logs(performed_by);

-- ============================================================================
-- 3. INCIDENT DRAFTS TABLE (for autosave)
-- ============================================================================

CREATE TABLE IF NOT EXISTS incident_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incident_reports(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    form_data JSONB NOT NULL,
    last_saved TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One draft per user per incident (or one draft per user if new)
    UNIQUE(user_id, incident_id)
);

CREATE INDEX idx_incident_drafts_user_id ON incident_drafts(user_id);
CREATE INDEX idx_incident_drafts_last_saved ON incident_drafts(last_saved DESC);

-- ============================================================================
-- 4. ENCRYPTION KEYS TABLE (for key rotation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS encryption_keys (
    version INTEGER PRIMARY KEY,
    key_encrypted TEXT NOT NULL, -- Master key encrypted with KMS or passphrase
    algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rotated_at TIMESTAMP WITH TIME ZONE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    CONSTRAINT only_one_active_key CHECK (
        active = FALSE OR 
        (SELECT COUNT(*) FROM encryption_keys WHERE active = TRUE) <= 1
    )
);

-- Insert initial encryption key (should be rotated immediately in production)
INSERT INTO encryption_keys (version, key_encrypted, active) 
VALUES (1, 'CHANGE_ME_IN_PRODUCTION', TRUE)
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- 5. INCIDENT ATTACHMENTS TABLE (separate for better management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS incident_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 10485760), -- 10MB max
    storage_type VARCHAR(20) NOT NULL CHECK (storage_type IN ('s3', 'local')),
    storage_path TEXT NOT NULL, -- S3 key or local path
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by VARCHAR(255) NOT NULL,
    virus_scanned BOOLEAN DEFAULT FALSE,
    virus_scan_result VARCHAR(50),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT attachments_filename_check CHECK (filename <> ''),
    CONSTRAINT attachments_uploaded_by_check CHECK (uploaded_by <> '')
);

CREATE INDEX idx_incident_attachments_incident_id ON incident_attachments(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_attachments_uploaded_at ON incident_attachments(uploaded_at DESC);

-- ============================================================================
-- 6. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_incident_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_incident_updated_at
    BEFORE UPDATE ON incident_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_updated_at();

-- Function to generate incident number
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    next_number INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    
    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(incident_number FROM 9) AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM incident_reports
    WHERE incident_number LIKE 'INC-' || year_part || '-%';
    
    sequence_part := LPAD(next_number::TEXT, 5, '0');
    
    RETURN 'INC-' || year_part || '-' || sequence_part;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate incident number on insert
CREATE OR REPLACE FUNCTION set_incident_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.incident_number IS NULL OR NEW.incident_number = '' THEN
        NEW.incident_number := generate_incident_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set incident number
CREATE TRIGGER trigger_set_incident_number
    BEFORE INSERT ON incident_reports
    FOR EACH ROW
    EXECUTE FUNCTION set_incident_number();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on incident_reports
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view their own incidents and those they're involved in
CREATE POLICY incident_reports_staff_select ON incident_reports
    FOR SELECT
    USING (
        deleted_at IS NULL AND (
            created_by = current_user OR
            staff_involved @> to_jsonb(ARRAY[current_user])
        )
    );

-- Policy: Supervisors can view all incidents
CREATE POLICY incident_reports_supervisor_select ON incident_reports
    FOR SELECT
    USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = current_user 
            AND role IN ('supervisor', 'admin')
        )
    );

-- Policy: Staff can insert their own incidents
CREATE POLICY incident_reports_staff_insert ON incident_reports
    FOR INSERT
    WITH CHECK (created_by = current_user);

-- Policy: Staff can update their own draft incidents
CREATE POLICY incident_reports_staff_update ON incident_reports
    FOR UPDATE
    USING (
        deleted_at IS NULL AND
        created_by = current_user AND
        status = 'draft'
    );

-- Policy: Supervisors can update any incident
CREATE POLICY incident_reports_supervisor_update ON incident_reports
    FOR UPDATE
    USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = current_user 
            AND role IN ('supervisor', 'admin')
        )
    );

-- ============================================================================
-- 8. USER ROLES TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('staff', 'supervisor', 'admin')),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by VARCHAR(255),
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_roles_role ON user_roles(role) WHERE revoked_at IS NULL;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE ON incident_reports TO authenticated_users;
-- GRANT SELECT, INSERT ON incident_audit_logs TO authenticated_users;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON incident_drafts TO authenticated_users;
-- GRANT SELECT ON encryption_keys TO authenticated_users;
-- GRANT SELECT, INSERT, DELETE ON incident_attachments TO authenticated_users;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add migration tracking
INSERT INTO schema_migrations (version, name, applied_at) 
VALUES (2, '002_incident_reports', NOW())
ON CONFLICT (version) DO NOTHING;