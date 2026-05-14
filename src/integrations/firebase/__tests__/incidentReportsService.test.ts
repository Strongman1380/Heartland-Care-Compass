import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  deleteDocMock: vi.fn(),
  getDocMock: vi.fn(),
  setDocMock: vi.fn(),
  docMock: vi.fn(),
  collectionMock: vi.fn(),
  queryMock: vi.fn(),
  orderByMock: vi.fn(),
  getDocsMock: vi.fn(),
  writeBatchMock: vi.fn(),
  auditLogMock: vi.fn(),
  youthLookupMock: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: mocks.collectionMock,
  doc: mocks.docMock,
  deleteDoc: mocks.deleteDocMock,
  getDoc: mocks.getDocMock,
  getDocs: mocks.getDocsMock,
  orderBy: mocks.orderByMock,
  query: mocks.queryMock,
  setDoc: mocks.setDocMock,
  writeBatch: mocks.writeBatchMock,
}))
vi.mock('@/integrations/firebase/auditLogService', () => ({
  auditLogService: {
    log: mocks.auditLogMock,
  },
}))
vi.mock('@/integrations/firebase/services', () => ({
  youthService: {
    getAllIncludingArchived: mocks.youthLookupMock,
  },
}))
vi.mock('@/integrations/firebase/dataGovernance', () => ({
  dateOnlyIso: (value: string) => value,
  nowIso: () => '2026-05-11T00:00:00.000Z',
  stripUndefinedDeep: (value: unknown) => value,
  withFirestoreMeta: (value: Record<string, unknown>, meta: Record<string, unknown>) => ({
    ...value,
    ...meta,
    createdAt: '2026-05-11T00:00:00.000Z',
    updatedAt: '2026-05-11T00:00:00.000Z',
  }),
}))

import { incidentReportsService } from '../incidentReportsService'

describe('incidentReportsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.docMock.mockReturnValue({ path: 'facility_incidents/incident-1' })
    mocks.collectionMock.mockReturnValue({ path: 'facility_incidents' })
    mocks.orderByMock.mockReturnValue({ field: 'dateOfIncident' })
    mocks.queryMock.mockReturnValue({ query: true })
    mocks.youthLookupMock.mockResolvedValue([])
  })

  it('hides soft-deleted incident reports from list results', async () => {
    mocks.getDocsMock.mockResolvedValueOnce({
      docs: [
        {
          id: 'incident-1',
          data: () => ({ id: 'incident-1', dateOfIncident: '2026-05-11' }),
        },
        {
          id: 'incident-2',
          data: () => ({ id: 'incident-2', dateOfIncident: '2026-05-10', deleted_at: '2026-05-11T00:00:00.000Z' }),
        },
      ],
    })

    await expect(incidentReportsService.list()).resolves.toEqual([
      { id: 'incident-1', dateOfIncident: '2026-05-11' },
    ])
  })

  it('uses the Firestore document id even when stored incident data has a blank id', async () => {
    mocks.getDocsMock.mockResolvedValueOnce({
      docs: [
        {
          id: 'incident-doc-id',
          data: () => ({ id: '', dateOfIncident: '2026-05-11' }),
        },
      ],
    })

    await expect(incidentReportsService.list()).resolves.toEqual([
      { id: 'incident-doc-id', dateOfIncident: '2026-05-11' },
    ])
  })

  it('does not fail delete when audit logging fails', async () => {
    const auditError = new Error('audit log unavailable')
    mocks.getDocMock.mockResolvedValueOnce({
      exists: () => true,
      id: 'incident-1',
      data: () => ({
        id: 'incident-1',
        updated_by: 'staff-1',
        created_by: 'staff-1',
        submittedBy: 'staff-1',
        source: 'manual',
      }),
    })
    mocks.deleteDocMock.mockResolvedValueOnce(undefined)
    mocks.auditLogMock.mockRejectedValueOnce(auditError)

    await expect(incidentReportsService.delete('incident-1')).resolves.toBeUndefined()
    expect(mocks.deleteDocMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to a soft delete when Firestore denies hard delete', async () => {
    mocks.getDocMock.mockResolvedValueOnce({
      exists: () => true,
      id: 'incident-1',
      data: () => ({
        id: 'incident-1',
        updated_by: 'staff-1',
        source: 'manual',
      }),
    })
    mocks.deleteDocMock.mockRejectedValueOnce({ code: 'permission-denied' })
    mocks.setDocMock.mockResolvedValueOnce(undefined)

    await expect(incidentReportsService.delete('incident-1')).resolves.toBeUndefined()
    expect(mocks.setDocMock).toHaveBeenCalledWith(
      { path: 'facility_incidents/incident-1' },
      expect.objectContaining({
        deleted_at: '2026-05-11T00:00:00.000Z',
        updated_at: '2026-05-11T00:00:00.000Z',
      }),
      { merge: true }
    )
  })

  it('does not fail save when audit logging fails', async () => {
    const auditError = new Error('audit log unavailable')
    mocks.docMock.mockReturnValue({})
    mocks.setDocMock.mockResolvedValueOnce(undefined)
    mocks.getDocMock.mockResolvedValueOnce({
      id: 'incident-2',
      data: () => ({
        id: 'incident-2',
        updatedAt: '2026-05-11T00:00:00.000Z',
      }),
    })
    mocks.auditLogMock.mockRejectedValueOnce(auditError)

    await expect(
      incidentReportsService.save({
        subjectType: 'Resident',
        lastName: 'Doe',
        firstName: 'Jane',
        initial: '',
        youthName: 'Doe, Jane',
        incidentDescription: 'Behavioral incident',
        dateOfIncident: '2026-05-11',
        timeOfIncident: '12:00',
        reportDate: '2026-05-11',
        reportTime: '12:00',
        staffCompletingReport: 'Staff Member',
        location: 'Unit A',
        youthInvolved: [],
        incidentTypes: ['Verbal Altercation'],
        narrativeSummary: 'Narrative',
        witnesses: [],
        notifications: [],
        supplementaryInfo: '',
        documentation: [],
        policyViolations: [],
        staffActions: [],
        followUpRecommendations: [],
        submittedBy: 'Staff Member',
        reviewedBy: '',
        signatureDate: '2026-05-11',
        status: 'draft',
        createdBy: 'staff-1',
        medicalAttentionRequired: false,
        parentsNotified: false,
        authoritiesNotified: false,
        photosTaken: false,
        videoRecorded: false,
        signatures: [],
        followUp: { required: false },
      })
    ).resolves.toMatchObject({ id: 'incident-2' })
    expect(mocks.setDocMock).toHaveBeenCalledTimes(1)
  })
})
