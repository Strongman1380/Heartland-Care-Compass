/**
 * Incident API Tests
 * Tests for incident reporting endpoints
 */

const request = require('supertest');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = require('../server/app'); // Assuming Express app export

describe('Incident API Tests', () => {
  let connection;
  let db;
  let staffToken;
  let supervisorToken;
  let adminToken;
  let testIncidentId;

  beforeAll(async () => {
    // Connect to test database
    connection = await MongoClient.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017');
    db = connection.db('heartland_test');
    
    // Set up test database
    app.locals.db = db;
    
    // Create test users and tokens
    staffToken = jwt.sign(
      { id: 'staff-1', role: 'staff', email: 'staff@test.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    supervisorToken = jwt.sign(
      { id: 'supervisor-1', role: 'supervisor', email: 'supervisor@test.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    adminToken = jwt.sign(
      { id: 'admin-1', role: 'admin', email: 'admin@test.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    // Insert test user roles
    await db.collection('user_roles').insertMany([
      { user_id: 'staff-1', role: 'staff', granted_at: new Date() },
      { user_id: 'supervisor-1', role: 'supervisor', granted_at: new Date() },
      { user_id: 'admin-1', role: 'admin', granted_at: new Date() }
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await db.collection('incident_reports').deleteMany({});
    await db.collection('incident_audit_logs').deleteMany({});
    await db.collection('user_roles').deleteMany({});
    await connection.close();
  });

  beforeEach(async () => {
    // Clear incidents before each test
    await db.collection('incident_reports').deleteMany({});
    await db.collection('incident_audit_logs').deleteMany({});
  });

  describe('POST /api/incidents', () => {
    it('should create a new incident report with valid data', async () => {
      const incidentData = {
        status: 'draft',
        incidentDate: '2025-01-15',
        incidentTime: '14:30',
        reportedDate: '2025-01-15',
        location: 'Common Room',
        incidentType: 'behavioral',
        severity: 'moderate',
        youthName: 'John Doe',
        youthAge: 15,
        summary: 'Brief summary of the incident that occurred',
        description: 'Detailed description of what happened during the incident. This needs to be at least 50 characters long.',
        staffInvolved: ['staff-1'],
        witnesses: [],
        immediateActions: [
          {
            timestamp: new Date().toISOString(),
            action: 'Separated youth from situation',
            takenBy: 'staff-1'
          }
        ],
        medicalAttentionRequired: false,
        parentsNotified: false,
        authoritiesNotified: false,
        attachments: [],
        photosTaken: false,
        videoRecorded: false,
        signatures: [
          {
            staffName: 'Test Staff',
            staffId: 'staff-1',
            signatureData: 'data:image/png;base64,test',
            timestamp: new Date().toISOString()
          }
        ],
        followUp: {
          required: false
        },
        createdBy: 'staff-1'
      };

      const response = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(incidentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.incident).toHaveProperty('id');
      expect(response.body.incident).toHaveProperty('incidentNumber');
      expect(response.body.incident.status).toBe('draft');
      
      testIncidentId = response.body.incident.id;
    });

    it('should reject incident with missing required fields', async () => {
      const incidentData = {
        status: 'draft',
        incidentDate: '2025-01-15'
        // Missing many required fields
      };

      const response = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(incidentData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should reject incident with invalid severity', async () => {
      const incidentData = {
        status: 'draft',
        incidentDate: '2025-01-15',
        incidentTime: '14:30',
        reportedDate: '2025-01-15',
        location: 'Common Room',
        incidentType: 'behavioral',
        severity: 'invalid-severity', // Invalid
        youthName: 'John Doe',
        summary: 'Brief summary',
        description: 'Detailed description that is long enough to pass validation',
        staffInvolved: ['staff-1'],
        witnesses: [],
        immediateActions: [],
        medicalAttentionRequired: false,
        parentsNotified: false,
        authoritiesNotified: false,
        attachments: [],
        photosTaken: false,
        videoRecorded: false,
        signatures: [],
        followUp: { required: false },
        createdBy: 'staff-1'
      };

      await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(incidentData)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/incidents')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/incidents', () => {
    beforeEach(async () => {
      // Create test incidents
      await db.collection('incident_reports').insertMany([
        {
          id: 'incident-1',
          incidentNumber: 'INC-2025-00001',
          status: 'submitted',
          createdBy: 'staff-1',
          incidentDate: '2025-01-15',
          incidentType: 'behavioral',
          severity: 'moderate',
          youthName: 'Youth 1',
          summary: 'Test incident 1',
          description: 'Description',
          staffInvolved: ['staff-1'],
          witnesses: [],
          immediateActions: [],
          medicalAttentionRequired: false,
          parentsNotified: false,
          authoritiesNotified: false,
          attachments: [],
          photosTaken: false,
          videoRecorded: false,
          signatures: [],
          followUp: { required: false },
          createdAt: new Date().toISOString()
        },
        {
          id: 'incident-2',
          incidentNumber: 'INC-2025-00002',
          status: 'submitted',
          createdBy: 'staff-2',
          incidentDate: '2025-01-14',
          incidentType: 'medical',
          severity: 'serious',
          youthName: 'Youth 2',
          summary: 'Test incident 2',
          description: 'Description',
          staffInvolved: ['staff-2'],
          witnesses: [],
          immediateActions: [],
          medicalAttentionRequired: true,
          parentsNotified: true,
          authoritiesNotified: false,
          attachments: [],
          photosTaken: false,
          videoRecorded: false,
          signatures: [],
          followUp: { required: false },
          createdAt: new Date().toISOString()
        }
      ]);
    });

    it('should return incidents for staff (only their own)', async () => {
      const response = await request(app)
        .get('/api/incidents')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.incidents).toHaveLength(1);
      expect(response.body.incidents[0].id).toBe('incident-1');
    });

    it('should return all incidents for supervisor', async () => {
      const response = await request(app)
        .get('/api/incidents')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.incidents).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/incidents?status=submitted')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body.incidents).toHaveLength(2);
      expect(response.body.incidents.every(i => i.status === 'submitted')).toBe(true);
    });

    it('should filter by incident type', async () => {
      const response = await request(app)
        .get('/api/incidents?incidentType=medical')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body.incidents).toHaveLength(1);
      expect(response.body.incidents[0].incidentType).toBe('medical');
    });

    it('should filter by severity', async () => {
      const response = await request(app)
        .get('/api/incidents?severity=serious')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body.incidents).toHaveLength(1);
      expect(response.body.incidents[0].severity).toBe('serious');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/incidents?page=1&pageSize=1')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body.incidents).toHaveLength(1);
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(1);
      expect(response.body.hasMore).toBe(true);
    });
  });

  describe('GET /api/incidents/:id', () => {
    beforeEach(async () => {
      await db.collection('incident_reports').insertOne({
        id: 'test-incident',
        incidentNumber: 'INC-2025-00001',
        status: 'submitted',
        createdBy: 'staff-1',
        incidentDate: '2025-01-15',
        incidentType: 'behavioral',
        severity: 'moderate',
        youthName: 'Youth 1',
        summary: 'Test incident',
        description: 'Description',
        staffInvolved: ['staff-1'],
        witnesses: [],
        immediateActions: [],
        medicalAttentionRequired: false,
        parentsNotified: false,
        authoritiesNotified: false,
        attachments: [],
        photosTaken: false,
        videoRecorded: false,
        signatures: [],
        followUp: { required: false },
        createdAt: new Date().toISOString()
      });
    });

    it('should return incident by ID', async () => {
      const response = await request(app)
        .get('/api/incidents/test-incident')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.incident.id).toBe('test-incident');
    });

    it('should return 404 for non-existent incident', async () => {
      await request(app)
        .get('/api/incidents/non-existent')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);
    });

    it('should deny access to other staff members incidents', async () => {
      const otherStaffToken = jwt.sign(
        { id: 'staff-2', role: 'staff' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .get('/api/incidents/test-incident')
        .set('Authorization', `Bearer ${otherStaffToken}`)
        .expect(403);
    });

    it('should allow supervisor to view any incident', async () => {
      const response = await request(app)
        .get('/api/incidents/test-incident')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body.incident.id).toBe('test-incident');
    });

    it('should log audit event when viewing', async () => {
      await request(app)
        .get('/api/incidents/test-incident')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const auditLog = await db.collection('incident_audit_logs').findOne({
        incidentId: 'test-incident',
        action: 'viewed'
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.performedBy).toBe('staff-1');
    });
  });

  describe('PATCH /api/incidents/:id', () => {
    beforeEach(async () => {
      await db.collection('incident_reports').insertOne({
        id: 'test-incident',
        incidentNumber: 'INC-2025-00001',
        status: 'draft',
        createdBy: 'staff-1',
        incidentDate: '2025-01-15',
        incidentType: 'behavioral',
        severity: 'moderate',
        youthName: 'Youth 1',
        summary: 'Test incident',
        description: 'Description',
        staffInvolved: ['staff-1'],
        witnesses: [],
        immediateActions: [],
        medicalAttentionRequired: false,
        parentsNotified: false,
        authoritiesNotified: false,
        attachments: [],
        photosTaken: false,
        videoRecorded: false,
        signatures: [],
        followUp: { required: false },
        createdAt: new Date().toISOString()
      });
    });

    it('should update incident', async () => {
      const updates = {
        summary: 'Updated summary for the incident',
        severity: 'serious'
      };

      const response = await request(app)
        .patch('/api/incidents/test-incident')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.incident.summary).toBe(updates.summary);
      expect(response.body.incident.severity).toBe(updates.severity);
    });

    it('should not allow staff to update submitted incidents', async () => {
      await db.collection('incident_reports').updateOne(
        { id: 'test-incident' },
        { $set: { status: 'submitted' } }
      );

      await request(app)
        .patch('/api/incidents/test-incident')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ summary: 'Updated' })
        .expect(403);
    });

    it('should allow supervisor to update any incident', async () => {
      const response = await request(app)
        .patch('/api/incidents/test-incident')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ summary: 'Supervisor update' })
        .expect(200);

      expect(response.body.incident.summary).toBe('Supervisor update');
    });

    it('should log audit event with changes', async () => {
      await request(app)
        .patch('/api/incidents/test-incident')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ severity: 'serious' })
        .expect(200);

      const auditLog = await db.collection('incident_audit_logs').findOne({
        incidentId: 'test-incident',
        action: 'updated'
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.changes).toBeDefined();
    });
  });

  describe('POST /api/incidents/:id/export', () => {
    beforeEach(async () => {
      await db.collection('incident_reports').insertOne({
        id: 'test-incident',
        incidentNumber: 'INC-2025-00001',
        status: 'submitted',
        createdBy: 'staff-1',
        incidentDate: '2025-01-15',
        incidentType: 'behavioral',
        severity: 'moderate',
        youthName: 'John Doe',
        youthAge: 15,
        summary: 'Test incident',
        description: 'Description',
        staffInvolved: ['staff-1'],
        witnesses: [{ name: 'Jane Smith', role: 'Staff' }],
        immediateActions: [],
        medicalAttentionRequired: false,
        parentsNotified: false,
        authoritiesNotified: false,
        attachments: [],
        photosTaken: false,
        videoRecorded: false,
        signatures: [],
        followUp: { required: false },
        createdAt: new Date().toISOString()
      });
    });

    it('should export incident (full)', async () => {
      const response = await request(app)
        .post('/api/incidents/test-incident/export')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ anonymize: false })
        .expect(200);

      expect(response.body.incident.youthName).toBe('John Doe');
      expect(response.body.anonymized).toBe(false);
    });

    it('should export incident (anonymized)', async () => {
      const response = await request(app)
        .post('/api/incidents/test-incident/export')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ anonymize: true })
        .expect(200);

      expect(response.body.incident.youthName).toBe('Resident 1');
      expect(response.body.incident.witnesses[0].name).toBe('[REDACTED]');
      expect(response.body.anonymized).toBe(true);
    });

    it('should log export audit event', async () => {
      await request(app)
        .post('/api/incidents/test-incident/export')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ anonymize: true })
        .expect(200);

      const auditLog = await db.collection('incident_audit_logs').findOne({
        incidentId: 'test-incident',
        action: 'exported'
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.exportType).toBe('anonymized');
    });
  });

  describe('GET /api/incidents/:id/audit-log', () => {
    beforeEach(async () => {
      await db.collection('incident_reports').insertOne({
        id: 'test-incident',
        incidentNumber: 'INC-2025-00001',
        status: 'submitted',
        createdBy: 'staff-1',
        incidentDate: '2025-01-15',
        incidentType: 'behavioral',
        severity: 'moderate',
        youthName: 'Youth 1',
        summary: 'Test incident',
        description: 'Description',
        staffInvolved: ['staff-1'],
        witnesses: [],
        immediateActions: [],
        medicalAttentionRequired: false,
        parentsNotified: false,
        authoritiesNotified: false,
        attachments: [],
        photosTaken: false,
        videoRecorded: false,
        signatures: [],
        followUp: { required: false },
        createdAt: new Date().toISOString()
      });

      await db.collection('incident_audit_logs').insertMany([
        {
          incidentId: 'test-incident',
          action: 'created',
          performedBy: 'staff-1',
          performedAt: new Date().toISOString()
        },
        {
          incidentId: 'test-incident',
          action: 'viewed',
          performedBy: 'supervisor-1',
          performedAt: new Date().toISOString()
        }
      ]);
    });

    it('should return audit log for supervisors', async () => {
      const response = await request(app)
        .get('/api/incidents/test-incident/audit-log')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body.logs).toHaveLength(2);
    });

    it('should deny access to staff', async () => {
      await request(app)
        .get('/api/incidents/test-incident/audit-log')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });
  });
});