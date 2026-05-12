import { describe, expect, it } from 'vitest'
import { parseBulkIncidents, parseIncidentText } from '../incidentParser'

describe('incidentParser', () => {
  it('maps Incident Narrative into the narrative summary field', () => {
    const result = parseIncidentText(`Subject Type: Resident
Last Name: Doe
First Name: John
Incident Date: 2026-05-11
Incident Type: Verbal Altercation
Incident Narrative: Staff documented the incident and processed it with the youth.`)

    expect(result.subjectType).toBe('Resident')
    expect(result.lastName).toBe('Doe')
    expect(result.firstName).toBe('John')
    expect(result.dateOfIncident).toBe('2026-05-11')
    expect(result.incidentTypes).toContain('Verbal Altercation')
    expect(result.narrativeSummary).toContain('Staff documented the incident')
  })

  it('splits and parses bulk incident text', () => {
    const reports = parseBulkIncidents(`Subject Type: Resident
Last Name: Doe
First Name: John
Incident Date: 2026-05-11
Incident Type: Verbal Altercation
Incident Narrative: First report
---
Subject Type: Resident
Last Name: Smith
First Name: Jane
Incident Date: 2026-05-11
Incident Type: Rule Violation
Incident Narrative: Second report`)

    expect(reports).toHaveLength(2)
    expect(reports[0]?.narrativeSummary).toContain('First report')
    expect(reports[1]?.narrativeSummary).toContain('Second report')
  })
})
