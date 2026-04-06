/**
 * Facility Incident Report Types for Heartland Boys Home
 * Used for general facility-level incident reporting with professional print output.
 */

export type SubjectType = 'Resident' | 'Non-Resident' | 'Employee';

export type FacilityIncidentType =
  | 'Verbal Altercation'
  | 'Threats / Intimidation'
  | 'Defiance / Noncompliance'
  | 'Disrespect Toward Staff'
  | 'Bullying / Harassment'
  | 'Sexualized Behavior / Sexual Misconduct'
  | 'Self-Harm Threat'
  | 'Self-Harm Attempt'
  | 'Suicidal Ideation / Suicide Threat'
  | 'Mental Health Crisis'
  | 'Aggression Toward Staff'
  | 'Contraband Possession'
  | 'Vape / Tobacco Use'
  | 'Drug / Alcohol Use or Suspicion'
  | 'UA Refusal / Failed UA'
  | 'Room Search / Contraband Discovery'
  | 'Boundary Violation'
  | 'Inappropriate Language / Slurs'
  | 'Disorderly Conduct / Major Disruption'
  | 'Elopement Attempt'
  | 'AWOL / Unauthorized Absence'
  | 'Restricted Area Violation'
  | 'Rule Violation'
  | 'School Incident'
  | 'Property Misuse / Tampering'
  | 'Medical Concern'
  | 'Emergency Medical Transport'
  | 'Medication Error'
  | 'Refusal of Care'
  | 'Law Enforcement Contact'
  | 'Abuse Allegation'
  | 'Neglect Allegation'
  | 'Peer Conflict'
  | 'Staff Concern / Suspicious Behavior'
  | 'Safety Hazard'
  | 'False Allegation'
  | 'Technology Misuse'
  | 'Inappropriate Sexual Comment / Gesture'
  | 'Gang-Related Behavior'
  | 'Possession of Weapon / Dangerous Item'
  | 'Theft'
  | 'Trespasser'
  | 'Property Damage'
  | 'Injury'
  | 'Physical Altercation'
  | 'Medication Refusal'
  | 'Fire/Alarm'
  | 'Runaway'
  | 'Arrest'
  | 'Other';

export type NotificationType =
  | 'Home Director'
  | 'Business Manager'
  | 'Supervisor'
  | 'Case Worker'
  | 'Physician'
  | 'Service Coordinator'
  | 'Psychiatrist'
  | 'Family'
  | 'Probation Officer'
  | 'Sheriff'
  | 'Other';

export type DocumentationType =
  | 'Photographs'
  | 'Physical Inspection'
  | 'Property Inspection'
  | 'Statement of Witness'
  | 'Property Damage Report'
  | 'Police Report'
  | 'Missing Person Report'
  | 'Other';

export interface InvolvedYouth {
  name: string;
  age: string;
  role: 'primary' | 'secondary' | 'witness' | 'victim';
}

export interface Witness {
  name: string;
  address: string;
  cityState: string;
  phone: string;
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
  // Subject info
  subjectType: SubjectType;
  lastName: string;
  firstName: string;
  initial: string;
  // Keep legacy field for backward compat
  youthName: string;
  // Incident details
  incidentDescription: string;
  dateOfIncident: string; // ISO date
  timeOfIncident: string; // HH:mm
  reportDate: string; // ISO date
  reportTime: string; // HH:mm
  staffCompletingReport: string;
  location: string;
  // Youth involved
  youthInvolved: InvolvedYouth[];
  // Incident types (multi-select)
  incidentTypes: FacilityIncidentType[];
  otherIncidentType?: string;
  // Narrative
  narrativeSummary: string;
  // Witnesses
  witnesses: Witness[];
  // Notifications
  notifications: NotificationType[];
  otherNotification?: string;
  // Supplementary Information
  supplementaryInfo: string;
  // Subject address if non-resident
  subjectAddress?: string;
  subjectPhone?: string;
  // Documentation checklist
  documentation: DocumentationType[];
  otherDocumentation?: string;
  // Policy violations
  policyViolations: PolicyViolation[];
  // Staff actions
  staffActions: StaffActionItem[];
  // Follow-up / recommendations
  followUpRecommendations: FollowUpItem[];
  // Signatures
  submittedBy: string;
  reviewedBy: string;
  signatureDate: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export type FacilityIncidentFormData = Omit<FacilityIncidentReport, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};
