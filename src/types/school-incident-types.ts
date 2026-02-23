/**
 * School Incident Report Types
 * Comprehensive type definitions for school-specific incident reporting
 */

export interface StaffMember {
  staff_id: string;
  name: string;
  role: string;
}

export interface InvolvedResident {
  resident_id: string;
  name: string;
  role_in_incident: 'aggressor' | 'victim' | 'witness' | 'bystander';
}

export interface Witness {
  name: string;
  role: 'peer' | 'staff' | 'teacher' | 'other';
  statement?: string;
}

export interface TimelineEntry {
  time: string; // HH:mm format
  entry: string;
}

export interface StaffSignature {
  staff_id: string;
  name: string;
  signed_at: string; // ISO timestamp
}

export interface FollowUp {
  assigned_to: string;
  due_date: string; // ISO date
  follow_up_notes?: string;
  completed?: boolean;
  completed_at?: string;
}

export interface SchoolIncidentReport {
  // Metadata
  incident_id: string; // Format: HHH-YYYY-####
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  
  // Basic Information
  date_time: string; // ISO timestamp
  reported_by: StaffMember;
  location: string;
  
  // Incident Classification
  incident_type: 
    | 'Aggression'
    | 'Disruption'
    | 'Property Damage'
    | 'Verbal Altercation'
    | 'Physical Altercation'
    | 'Refusal to Follow Directions'
    | 'Inappropriate Language'
    | 'Tardy/Absence'
    | 'Academic Dishonesty'
    | 'Other';
  
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  
  // People Involved
  involved_residents: InvolvedResident[];
  witnesses: Witness[];
  
  // Incident Details
  summary: string; // Brief one-line summary
  timeline: TimelineEntry[]; // Chronological sequence of events
  actions_taken: string; // Detailed description of interventions
  
  // Medical & Safety
  medical_needed: boolean;
  medical_details?: string;
  
  // Documentation
  attachments: Array<{
    filename: string;
    url?: string;
    uploaded_at: string;
  }>;
  
  // Signatures & Approval
  staff_signatures: StaffSignature[];
  
  // Follow-up
  follow_up?: FollowUp;
  
  // Confidential Notes (encrypted in production)
  confidential_notes?: string;
  
  // Soft Delete
  deleted_at?: string;
  deleted_by?: string;
}

export interface SchoolIncidentFormData extends Omit<SchoolIncidentReport, 'incident_id' | 'created_at' | 'updated_at'> {
  incident_id?: string;
  created_at?: string;
  updated_at?: string;
}