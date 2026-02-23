/**
 * JSON Schema and Zod validation for Incident Reports
 */

import { z } from 'zod';

// Zod schemas for runtime validation
export const IncidentWitnessSchema = z.object({
  name: z.string().min(1, 'Witness name is required'),
  role: z.string().min(1, 'Witness role is required'),
  statement: z.string().optional(),
  contactInfo: z.string().optional(),
});

export const IncidentActionSchema = z.object({
  timestamp: z.string().datetime(),
  action: z.string().min(1, 'Action description is required'),
  takenBy: z.string().min(1, 'Staff member is required'),
  notes: z.string().optional(),
});

export const IncidentAttachmentSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive().max(10 * 1024 * 1024, 'File size must not exceed 10MB'),
  uploadedAt: z.string().datetime(),
  uploadedBy: z.string().min(1),
  url: z.string().url().optional(),
  s3Key: z.string().optional(),
});

export const IncidentSignatureSchema = z.object({
  staffName: z.string().min(1, 'Staff name is required'),
  staffId: z.string().min(1, 'Staff ID is required'),
  signatureData: z.string().min(1, 'Signature is required'),
  timestamp: z.string().datetime(),
  ipAddress: z.string().optional(),
});

export const IncidentFollowUpSchema = z.object({
  required: z.boolean(),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
});

export const IncidentReportSchema = z.object({
  // Metadata
  id: z.string().uuid().optional(),
  incidentNumber: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'under_review', 'resolved', 'archived']),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  createdBy: z.string().min(1, 'Creator is required'),
  lastModifiedBy: z.string().optional(),
  
  // Incident Details
  incidentDate: z.string().min(1, 'Incident date is required'),
  incidentTime: z.string().min(1, 'Incident time is required'),
  reportedDate: z.string().min(1, 'Reported date is required'),
  location: z.string().min(1, 'Location is required'),
  incidentType: z.enum([
    'behavioral',
    'medical',
    'safety',
    'property_damage',
    'runaway',
    'self_harm',
    'aggression',
    'substance_use',
    'other'
  ]),
  severity: z.enum(['minor', 'moderate', 'serious', 'critical']),
  
  // Youth Information
  youthId: z.string().optional(),
  youthName: z.string().min(1, 'Youth name is required'),
  youthAge: z.number().int().positive().optional(),
  youthDOB: z.string().optional(),
  
  // Incident Description
  summary: z.string().min(10, 'Summary must be at least 10 characters').max(200, 'Summary must not exceed 200 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  antecedents: z.string().optional(),
  behavior: z.string().optional(),
  consequences: z.string().optional(),
  
  // People Involved
  staffInvolved: z.array(z.string()).min(1, 'At least one staff member must be involved'),
  witnesses: z.array(IncidentWitnessSchema),
  othersInvolved: z.array(z.string()).optional(),
  
  // Actions Taken
  immediateActions: z.array(IncidentActionSchema).min(1, 'At least one action must be documented'),
  interventionsUsed: z.array(z.string()).optional(),
  medicalAttentionRequired: z.boolean(),
  medicalDetails: z.string().optional(),
  
  // Notifications
  parentsNotified: z.boolean(),
  parentsNotifiedAt: z.string().optional(),
  parentsNotifiedBy: z.string().optional(),
  authoritiesNotified: z.boolean(),
  authoritiesNotifiedDetails: z.string().optional(),
  
  // Attachments & Evidence
  attachments: z.array(IncidentAttachmentSchema),
  photosTaken: z.boolean(),
  videoRecorded: z.boolean(),
  
  // Signatures
  signatures: z.array(IncidentSignatureSchema).min(1, 'At least one signature is required'),
  
  // Follow-up
  followUp: IncidentFollowUpSchema,
  
  // Additional Notes
  additionalNotes: z.string().optional(),
  
  // Privacy & Security
  encryptedFields: z.array(z.string()).optional(),
  redactedForExport: z.boolean().optional(),
}).refine(
  (data) => {
    // If medical attention required, medical details must be provided
    if (data.medicalAttentionRequired && !data.medicalDetails) {
      return false;
    }
    return true;
  },
  {
    message: 'Medical details are required when medical attention is needed',
    path: ['medicalDetails'],
  }
).refine(
  (data) => {
    // If parents notified, notification details must be provided
    if (data.parentsNotified && (!data.parentsNotifiedAt || !data.parentsNotifiedBy)) {
      return false;
    }
    return true;
  },
  {
    message: 'Parent notification details are required when parents are notified',
    path: ['parentsNotifiedAt'],
  }
).refine(
  (data) => {
    // If authorities notified, details must be provided
    if (data.authoritiesNotified && !data.authoritiesNotifiedDetails) {
      return false;
    }
    return true;
  },
  {
    message: 'Authority notification details are required',
    path: ['authoritiesNotifiedDetails'],
  }
);

// JSON Schema for documentation and external validation
export const IncidentReportJSONSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Incident Report',
  description: 'Comprehensive incident report for Heartland Boys Home',
  type: 'object',
  required: [
    'status',
    'createdBy',
    'incidentDate',
    'incidentTime',
    'reportedDate',
    'location',
    'incidentType',
    'severity',
    'youthName',
    'summary',
    'description',
    'staffInvolved',
    'immediateActions',
    'medicalAttentionRequired',
    'parentsNotified',
    'authoritiesNotified',
    'photosTaken',
    'videoRecorded',
    'signatures',
    'followUp'
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    incidentNumber: { type: 'string' },
    status: { 
      type: 'string', 
      enum: ['draft', 'submitted', 'under_review', 'resolved', 'archived'] 
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    createdBy: { type: 'string', minLength: 1 },
    lastModifiedBy: { type: 'string' },
    incidentDate: { type: 'string', format: 'date' },
    incidentTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
    reportedDate: { type: 'string', format: 'date' },
    location: { type: 'string', minLength: 1 },
    incidentType: {
      type: 'string',
      enum: [
        'behavioral',
        'medical',
        'safety',
        'property_damage',
        'runaway',
        'self_harm',
        'aggression',
        'substance_use',
        'other'
      ]
    },
    severity: {
      type: 'string',
      enum: ['minor', 'moderate', 'serious', 'critical']
    },
    youthId: { type: 'string' },
    youthName: { type: 'string', minLength: 1 },
    youthAge: { type: 'integer', minimum: 0 },
    youthDOB: { type: 'string', format: 'date' },
    summary: { type: 'string', minLength: 10, maxLength: 200 },
    description: { type: 'string', minLength: 50 },
    antecedents: { type: 'string' },
    behavior: { type: 'string' },
    consequences: { type: 'string' },
    staffInvolved: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1
    },
    witnesses: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'role'],
        properties: {
          name: { type: 'string', minLength: 1 },
          role: { type: 'string', minLength: 1 },
          statement: { type: 'string' },
          contactInfo: { type: 'string' }
        }
      }
    },
    othersInvolved: {
      type: 'array',
      items: { type: 'string' }
    },
    immediateActions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['timestamp', 'action', 'takenBy'],
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          action: { type: 'string', minLength: 1 },
          takenBy: { type: 'string', minLength: 1 },
          notes: { type: 'string' }
        }
      },
      minItems: 1
    },
    interventionsUsed: {
      type: 'array',
      items: { type: 'string' }
    },
    medicalAttentionRequired: { type: 'boolean' },
    medicalDetails: { type: 'string' },
    parentsNotified: { type: 'boolean' },
    parentsNotifiedAt: { type: 'string', format: 'date-time' },
    parentsNotifiedBy: { type: 'string' },
    authoritiesNotified: { type: 'boolean' },
    authoritiesNotifiedDetails: { type: 'string' },
    attachments: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'filename', 'fileType', 'fileSize', 'uploadedAt', 'uploadedBy'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          filename: { type: 'string', minLength: 1 },
          fileType: { type: 'string', minLength: 1 },
          fileSize: { type: 'number', maximum: 10485760 },
          uploadedAt: { type: 'string', format: 'date-time' },
          uploadedBy: { type: 'string', minLength: 1 },
          url: { type: 'string', format: 'uri' },
          s3Key: { type: 'string' }
        }
      }
    },
    photosTaken: { type: 'boolean' },
    videoRecorded: { type: 'boolean' },
    signatures: {
      type: 'array',
      items: {
        type: 'object',
        required: ['staffName', 'staffId', 'signatureData', 'timestamp'],
        properties: {
          staffName: { type: 'string', minLength: 1 },
          staffId: { type: 'string', minLength: 1 },
          signatureData: { type: 'string', minLength: 1 },
          timestamp: { type: 'string', format: 'date-time' },
          ipAddress: { type: 'string' }
        }
      },
      minItems: 1
    },
    followUp: {
      type: 'object',
      required: ['required'],
      properties: {
        required: { type: 'boolean' },
        dueDate: { type: 'string', format: 'date' },
        assignedTo: { type: 'string' },
        description: { type: 'string' },
        completed: { type: 'boolean' },
        completedAt: { type: 'string', format: 'date-time' },
        completedBy: { type: 'string' }
      }
    },
    additionalNotes: { type: 'string' },
    encryptedFields: {
      type: 'array',
      items: { type: 'string' }
    },
    redactedForExport: { type: 'boolean' }
  }
};

export type IncidentReportInput = z.infer<typeof IncidentReportSchema>;