/**
 * Incident Report Types for Heartland Boys Home
 * Comprehensive type definitions for incident reporting system
 */

export type IncidentSeverity = 'minor' | 'moderate' | 'serious' | 'critical';
export type IncidentType = 
  | 'behavioral' 
  | 'medical' 
  | 'safety' 
  | 'property_damage' 
  | 'runaway' 
  | 'self_harm' 
  | 'aggression' 
  | 'substance_use'
  | 'other';

export type IncidentStatus = 'draft' | 'submitted' | 'under_review' | 'resolved' | 'archived';
export type UserRole = 'staff' | 'supervisor' | 'admin';

export interface IncidentWitness {
  name: string;
  role: string;
  statement?: string;
  contactInfo?: string;
}

export interface IncidentAction {
  timestamp: string;
  action: string;
  takenBy: string;
  notes?: string;
}

export interface IncidentAttachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  url?: string;
  s3Key?: string;
}

export interface IncidentSignature {
  staffName: string;
  staffId: string;
  signatureData: string; // Base64 encoded signature image
  timestamp: string;
  ipAddress?: string;
}

export interface IncidentFollowUp {
  required: boolean;
  dueDate?: string;
  assignedTo?: string;
  description?: string;
  completed?: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface IncidentReport {
  // Metadata
  id: string;
  incidentNumber: string; // Auto-generated unique identifier
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
  
  // Incident Details
  incidentDate: string;
  incidentTime: string;
  reportedDate: string;
  location: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  
  // Youth Information (PII - handle with care)
  youthId?: string; // Reference to youth profile
  youthName: string; // Will be redacted in exports
  youthAge?: number;
  youthDOB?: string; // Encrypted
  
  // Incident Description
  summary: string; // Brief one-line summary
  description: string; // Detailed narrative
  antecedents?: string; // What happened before
  behavior?: string; // What the youth did
  consequences?: string; // What happened after
  
  // People Involved
  staffInvolved: string[]; // Staff member names/IDs
  witnesses: IncidentWitness[];
  othersInvolved?: string[]; // Other youth, visitors, etc.
  
  // Actions Taken
  immediateActions: IncidentAction[];
  interventionsUsed?: string[]; // De-escalation techniques, restraints, etc.
  medicalAttentionRequired: boolean;
  medicalDetails?: string; // Encrypted if contains sensitive info
  
  // Notifications
  parentsNotified: boolean;
  parentsNotifiedAt?: string;
  parentsNotifiedBy?: string;
  authoritiesNotified: boolean;
  authoritiesNotifiedDetails?: string;
  
  // Attachments & Evidence
  attachments: IncidentAttachment[];
  photosTaken: boolean;
  videoRecorded: boolean;
  
  // Signatures
  signatures: IncidentSignature[];
  
  // Follow-up
  followUp: IncidentFollowUp;
  
  // Additional Notes
  additionalNotes?: string;
  
  // Privacy & Security
  encryptedFields?: string[]; // List of fields that are encrypted
  redactedForExport?: boolean;
}

export interface IncidentAuditLog {
  id: string;
  incidentId: string;
  action: 'created' | 'updated' | 'viewed' | 'exported' | 'deleted' | 'status_changed';
  performedBy: string;
  performedAt: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, any>; // What changed
  exportType?: 'full' | 'anonymized';
}

export interface IncidentListFilters {
  status?: IncidentStatus[];
  incidentType?: IncidentType[];
  severity?: IncidentSeverity[];
  dateFrom?: string;
  dateTo?: string;
  youthId?: string;
  createdBy?: string;
  search?: string;
}

export interface IncidentListResponse {
  incidents: IncidentReport[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface IncidentExportOptions {
  anonymize: boolean;
  includeAttachments: boolean;
  redactSensitiveInfo: boolean;
  format: 'pdf' | 'json';
}

// Form state for autosave
export interface IncidentDraft {
  draftId: string;
  incidentId?: string;
  formData: Partial<IncidentReport>;
  lastSaved: string;
  userId: string;
}