/**
 * Incident Report API Routes
 * Handles CRUD operations, file uploads, and PDF exports
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { encryptionService } = require('./utils/encryption');
const { IncidentReportSchema } = require('../src/schemas/incident-schema');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed.'));
    }
  }
});

/**
 * Middleware to check user role
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

/**
 * Middleware to log audit events
 */
async function logAudit(db, incidentId, action, userId, changes = null, exportType = null) {
  try {
    await db.collection('incident_audit_logs').insertOne({
      id: uuidv4(),
      incidentId,
      action,
      performedBy: userId,
      performedAt: new Date().toISOString(),
      ipAddress: null, // Set from req.ip in route
      userAgent: null, // Set from req.headers in route
      changes,
      exportType
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

/**
 * Encrypt sensitive fields in incident report
 */
function encryptSensitiveFields(incident) {
  const encrypted = { ...incident };
  const encryptedFields = [];
  
  // Encrypt youth name
  if (incident.youthName) {
    encrypted.youthNameEncrypted = encryptionService.encrypt(incident.youthName);
    delete encrypted.youthName;
    encryptedFields.push('youthName');
  }
  
  // Encrypt DOB
  if (incident.youthDOB) {
    encrypted.youthDOBEncrypted = encryptionService.encrypt(incident.youthDOB);
    delete encrypted.youthDOB;
    encryptedFields.push('youthDOB');
  }
  
  // Encrypt medical details
  if (incident.medicalDetails) {
    encrypted.medicalDetailsEncrypted = encryptionService.encrypt(incident.medicalDetails);
    delete encrypted.medicalDetails;
    encryptedFields.push('medicalDetails');
  }
  
  encrypted.encryptedFields = encryptedFields;
  return encrypted;
}

/**
 * Decrypt sensitive fields in incident report
 */
function decryptSensitiveFields(incident) {
  const decrypted = { ...incident };
  
  if (incident.youthNameEncrypted) {
    decrypted.youthName = encryptionService.decrypt(incident.youthNameEncrypted);
    delete decrypted.youthNameEncrypted;
  }
  
  if (incident.youthDOBEncrypted) {
    decrypted.youthDOB = encryptionService.decrypt(incident.youthDOBEncrypted);
    delete decrypted.youthDOBEncrypted;
  }
  
  if (incident.medicalDetailsEncrypted) {
    decrypted.medicalDetails = encryptionService.decrypt(incident.medicalDetailsEncrypted);
    delete decrypted.medicalDetailsEncrypted;
  }
  
  return decrypted;
}

/**
 * Generate incident number
 */
function generateIncidentNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `INC-${year}-${random}`;
}

/**
 * POST /api/incidents - Create new incident report
 */
router.post('/', requireRole(['staff', 'supervisor', 'admin']), async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    // Validate input
    const validationResult = IncidentReportSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }
    
    const incidentData = validationResult.data;
    
    // Generate ID and incident number
    const id = uuidv4();
    const incidentNumber = generateIncidentNumber();
    
    // Encrypt sensitive fields
    const encrypted = encryptSensitiveFields(incidentData);
    
    // Prepare document
    const incident = {
      ...encrypted,
      id,
      incidentNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.id,
      lastModifiedBy: req.user.id,
      encryptionKeyVersion: 1
    };
    
    // Insert into database
    await db.collection('incident_reports').insertOne(incident);
    
    // Log audit event
    await logAudit(db, id, 'created', req.user.id);
    
    // Return decrypted version
    const response = decryptSensitiveFields(incident);
    
    res.status(201).json({
      success: true,
      incident: response
    });
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({
      error: 'Failed to create incident report',
      message: error.message
    });
  }
});

/**
 * GET /api/incidents - List incident reports with filters
 */
router.get('/', requireRole(['staff', 'supervisor', 'admin']), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const {
      status,
      incidentType,
      severity,
      dateFrom,
      dateTo,
      youthId,
      search,
      page = 1,
      pageSize = 20
    } = req.query;
    
    // Build query
    const query = { deletedAt: { $exists: false } };
    
    // Role-based access control
    if (req.user.role === 'staff') {
      // Staff can only see their own incidents or ones they're involved in
      query.$or = [
        { createdBy: req.user.id },
        { staffInvolved: req.user.id }
      ];
    }
    
    // Apply filters
    if (status) {
      query.status = { $in: status.split(',') };
    }
    
    if (incidentType) {
      query.incidentType = { $in: incidentType.split(',') };
    }
    
    if (severity) {
      query.severity = { $in: severity.split(',') };
    }
    
    if (dateFrom || dateTo) {
      query.incidentDate = {};
      if (dateFrom) query.incidentDate.$gte = dateFrom;
      if (dateTo) query.incidentDate.$lte = dateTo;
    }
    
    if (youthId) {
      query.youthId = youthId;
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // Execute query
    const [incidents, total] = await Promise.all([
      db.collection('incident_reports')
        .find(query)
        .sort({ incidentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('incident_reports').countDocuments(query)
    ]);
    
    // Decrypt sensitive fields
    const decrypted = incidents.map(incident => {
      const dec = decryptSensitiveFields(incident);
      // Don't send full medical details in list view
      if (dec.medicalDetails) {
        dec.medicalDetails = '[Encrypted - view details]';
      }
      return dec;
    });
    
    res.json({
      success: true,
      incidents: decrypted,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      hasMore: skip + incidents.length < total
    });
  } catch (error) {
    console.error('List incidents error:', error);
    res.status(500).json({
      error: 'Failed to retrieve incidents',
      message: error.message
    });
  }
});

/**
 * GET /api/incidents/:id - Get single incident report
 */
router.get('/:id', requireRole(['staff', 'supervisor', 'admin']), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    const incident = await db.collection('incident_reports').findOne({
      id,
      deletedAt: { $exists: false }
    });
    
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    // Check access permissions
    if (req.user.role === 'staff') {
      const hasAccess = 
        incident.createdBy === req.user.id ||
        incident.staffInvolved.includes(req.user.id);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Log audit event
    await logAudit(db, id, 'viewed', req.user.id);
    
    // Decrypt and return
    const decrypted = decryptSensitiveFields(incident);
    
    res.json({
      success: true,
      incident: decrypted
    });
  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({
      error: 'Failed to retrieve incident',
      message: error.message
    });
  }
});

/**
 * PATCH /api/incidents/:id - Update incident report
 */
router.patch('/:id', requireRole(['staff', 'supervisor', 'admin']), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    // Get existing incident
    const existing = await db.collection('incident_reports').findOne({
      id,
      deletedAt: { $exists: false }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    // Check permissions
    if (req.user.role === 'staff') {
      // Staff can only update their own drafts
      if (existing.createdBy !== req.user.id || existing.status !== 'draft') {
        return res.status(403).json({ error: 'Cannot update this incident' });
      }
    }
    
    // Validate update
    const validationResult = IncidentReportSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }
    
    const updates = validationResult.data;
    
    // Encrypt sensitive fields
    const encrypted = encryptSensitiveFields(updates);
    
    // Track changes for audit
    const changes = {};
    Object.keys(encrypted).forEach(key => {
      if (existing[key] !== encrypted[key]) {
        changes[key] = {
          old: existing[key],
          new: encrypted[key]
        };
      }
    });
    
    // Update document
    const updated = {
      ...encrypted,
      updatedAt: new Date().toISOString(),
      lastModifiedBy: req.user.id
    };
    
    await db.collection('incident_reports').updateOne(
      { id },
      { $set: updated }
    );
    
    // Log audit event
    await logAudit(db, id, 'updated', req.user.id, changes);
    
    // Get updated document
    const incident = await db.collection('incident_reports').findOne({ id });
    const decrypted = decryptSensitiveFields(incident);
    
    res.json({
      success: true,
      incident: decrypted
    });
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({
      error: 'Failed to update incident',
      message: error.message
    });
  }
});

/**
 * POST /api/incidents/:id/attachments - Upload attachments
 */
router.post('/:id/attachments', 
  requireRole(['staff', 'supervisor', 'admin']),
  upload.array('files', 10),
  async (req, res) => {
    try {
      const db = req.app.locals.db;
      const { id } = req.params;
      
      // Verify incident exists
      const incident = await db.collection('incident_reports').findOne({
        id,
        deletedAt: { $exists: false }
      });
      
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      
      // Check permissions
      if (req.user.role === 'staff' && incident.createdBy !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const attachments = [];
      
      // Process each file
      for (const file of req.files) {
        const attachmentId = uuidv4();
        const filename = `${attachmentId}-${file.originalname}`;
        
        // Save to local storage (or S3 in production)
        const uploadDir = path.join(__dirname, '../uploads/incidents', id);
        await fs.mkdir(uploadDir, { recursive: true });
        
        const filepath = path.join(uploadDir, filename);
        await fs.writeFile(filepath, file.buffer);
        
        const attachment = {
          id: attachmentId,
          filename: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: req.user.id,
          storagePath: filepath
        };
        
        attachments.push(attachment);
      }
      
      // Update incident with new attachments
      await db.collection('incident_reports').updateOne(
        { id },
        {
          $push: { attachments: { $each: attachments } },
          $set: {
            updatedAt: new Date().toISOString(),
            lastModifiedBy: req.user.id
          }
        }
      );
      
      res.json({
        success: true,
        attachments
      });
    } catch (error) {
      console.error('Upload attachment error:', error);
      res.status(500).json({
        error: 'Failed to upload attachments',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/incidents/:id/export - Export incident as PDF
 */
router.post('/:id/export', requireRole(['staff', 'supervisor', 'admin']), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { anonymize = false } = req.body;
    
    const incident = await db.collection('incident_reports').findOne({
      id,
      deletedAt: { $exists: false }
    });
    
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    // Check permissions
    if (req.user.role === 'staff') {
      const hasAccess = 
        incident.createdBy === req.user.id ||
        incident.staffInvolved.includes(req.user.id);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Decrypt incident
    let decrypted = decryptSensitiveFields(incident);
    
    // Anonymize if requested
    if (anonymize) {
      decrypted = anonymizeIncident(decrypted);
    }
    
    // Log audit event
    await logAudit(
      db,
      id,
      'exported',
      req.user.id,
      null,
      anonymize ? 'anonymized' : 'full'
    );
    
    // Return incident data for PDF generation on client
    res.json({
      success: true,
      incident: decrypted,
      anonymized: anonymize
    });
  } catch (error) {
    console.error('Export incident error:', error);
    res.status(500).json({
      error: 'Failed to export incident',
      message: error.message
    });
  }
});

/**
 * Anonymize incident for external export
 */
function anonymizeIncident(incident) {
  const anonymized = { ...incident };
  
  // Replace youth name with generic identifier
  anonymized.youthName = 'Resident 1';
  
  // Redact DOB
  if (anonymized.youthDOB) {
    anonymized.youthDOB = '[REDACTED]';
  }
  
  // Redact age
  if (anonymized.youthAge) {
    anonymized.youthAge = null;
  }
  
  // Redact witness contact info
  if (anonymized.witnesses) {
    anonymized.witnesses = anonymized.witnesses.map(w => ({
      ...w,
      name: '[REDACTED]',
      contactInfo: '[REDACTED]'
    }));
  }
  
  // Redact medical details
  if (anonymized.medicalDetails) {
    anonymized.medicalDetails = '[REDACTED FOR PRIVACY]';
  }
  
  // Redact parent notification details
  if (anonymized.parentsNotifiedBy) {
    anonymized.parentsNotifiedBy = '[REDACTED]';
  }
  
  anonymized.redactedForExport = true;
  
  return anonymized;
}

/**
 * GET /api/incidents/:id/audit-log - Get audit log for incident
 */
router.get('/:id/audit-log', requireRole(['supervisor', 'admin']), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    const logs = await db.collection('incident_audit_logs')
      .find({ incidentId: id })
      .sort({ performedAt: -1 })
      .toArray();
    
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      error: 'Failed to retrieve audit log',
      message: error.message
    });
  }
});

module.exports = router;