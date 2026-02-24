/**
 * Facility Incident Report Types for Heartland Boys Home
 * Used for general facility-level incident reporting with professional print output.
 */

export type FacilityIncidentType =
  | 'Physical Aggression'
  | 'Verbal Aggression'
  | 'Property Destruction'
  | 'Self-Harm / Self-Injurious Behavior'
  | 'Elopement / Runaway'
  | 'Substance Use / Possession'
  | 'Sexual Misconduct'
  | 'Theft'
  | 'Non-Compliance / Refusal'
  | 'Medical Emergency'
  | 'Restraint / Seclusion'
  | 'Suicide Ideation / Attempt'
  | 'Bullying / Intimidation'
  | 'Other';

export interface InvolvedYouth {
  name: string;
  age: string;
  role: 'primary' | 'secondary' | 'witness' | 'victim';
}

export interface PolicyViolation {
  description: string;
}

export interface StaffActionItem {
  description: string;
}

export interface FollowUpItem {
  description: string;
}

export interface FacilityIncidentReport {
  id: string;
  // Report header
  youthName: string;
  // Incident details
  dateOfIncident: string; // ISO date
  timeOfIncident: string; // HH:mm
  staffCompletingReport: string;
  location: string;
  // Youth involved
  youthInvolved: InvolvedYouth[];
  // Incident types (multi-select)
  incidentTypes: FacilityIncidentType[];
  otherIncidentType?: string;
  // Narrative
  narrativeSummary: string;
  // Policy violations
  policyViolations: PolicyViolation[];
  // Staff actions
  staffActions: StaffActionItem[];
  // Follow-up / recommendations
  followUpRecommendations: FollowUpItem[];
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export type FacilityIncidentFormData = Omit<FacilityIncidentReport, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};
