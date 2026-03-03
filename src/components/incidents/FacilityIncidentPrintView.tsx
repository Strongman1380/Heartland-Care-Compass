import React from 'react'
import { format } from 'date-fns'
import type {
  FacilityIncidentReport,
  FacilityIncidentType,
  NotificationType,
  DocumentationType,
} from '@/types/facility-incident-types'

const ALL_INCIDENT_TYPES: FacilityIncidentType[] = [
  'Theft', 'Trespasser', 'Property Damage', 'Injury',
  'Physical Altercation', 'Medication Refusal', 'Fire/Alarm', 'Runaway', 'Arrest',
]

const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  'Home Director', 'Business Manager', 'Supervisor', 'Case Worker', 'Physician',
  'Service Coordinator', 'Psychiatrist', 'Family', 'Probation Officer', 'Sheriff',
]

const LEFT_DOCS: DocumentationType[] = ['Photographs', 'Physical Inspection', 'Property Inspection', 'Statement of Witness']
const RIGHT_DOCS: DocumentationType[] = ['Property Damage Report', 'Police Report', 'Missing Person Report']

interface Props {
  report: FacilityIncidentReport
}

const FacilityIncidentPrintView = React.forwardRef<HTMLDivElement, Props>(
  ({ report }, ref) => {
    const wrapText = {
      whiteSpace: 'normal' as const,
      overflowWrap: 'break-word' as const,
      wordBreak: 'normal' as const,
    }

    const formatDate = (d: string) => {
      if (!d) return ''

      const dateOnlyMatch = d.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch
        return `${month}/${day}/${year.slice(-2)}`
      }

      try {
        const parsed = new Date(d)
        if (Number.isNaN(parsed.getTime())) return d
        return format(parsed, 'MM/dd/yy')
      } catch {
        return d
      }
    }
    const formatTime = (t: string) => {
      if (!t) return ''
      try {
        const [h, m] = t.split(':')
        const hour = parseInt(h, 10)
        const ampm = hour >= 12 ? 'pm' : 'am'
        const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        return `${h12}:${m.padStart(2, '0')}${ampm}`
      } catch { return t }
    }

    const incidentDateTime = [
      report.dateOfIncident ? formatDate(report.dateOfIncident) : '',
      report.timeOfIncident ? formatTime(report.timeOfIncident) : '',
    ].filter(Boolean).join(' ')

    const reportDateTime = [
      report.reportDate ? formatDate(report.reportDate) : '',
      report.reportTime ? formatTime(report.reportTime) : '',
    ].filter(Boolean).join(' ')

    const submittedSignature = report.submittedBy?.trim() || report.staffCompletingReport?.trim() || ''
    const signatureDate = report.signatureDate?.trim() || report.reportDate?.trim() || ''

    // Normalize legacy 'Fighting' → 'Physical Altercation' from older reports
    const normalizedTypes = report.incidentTypes?.map(t => t === 'Fighting' as any ? 'Physical Altercation' : t) || []
    const isCheckedType = (t: FacilityIncidentType) => normalizedTypes.includes(t)
    const isCheckedNotif = (t: NotificationType) => report.notifications?.includes(t)
    const isCheckedDoc = (t: DocumentationType) => report.documentation?.includes(t)

    const selectedIncidentTypes = [
      ...ALL_INCIDENT_TYPES.filter(isCheckedType),
      ...(report.incidentTypes?.includes('Other') && report.otherIncidentType ? [report.otherIncidentType] : []),
    ]

    const selectedNotifications = [
      ...ALL_NOTIFICATION_TYPES.filter((t) => isCheckedNotif(t)),
      ...(report.notifications?.includes('Other') && report.otherNotification ? [report.otherNotification] : []),
    ]

    return (
      <div
        ref={ref}
        style={{
          fontFamily: "'Times New Roman', Georgia, serif",
          color: '#000',
          lineHeight: 1.4,
          maxWidth: '8.5in',
          margin: '0 auto',
          padding: '0.4in 0.5in',
          backgroundColor: '#fff',
          fontSize: '12px',
          ...wrapText,
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px' }}>
            INCIDENT REPORT
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Heartland Boys Home</div>
        </div>

        {/* Subject type row */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px 40px', marginBottom: '8px', borderBottom: '2px solid #000', paddingBottom: '6px' }}>
          <span style={{ textDecoration: report.subjectType === 'Resident' ? 'underline' : 'none', fontWeight: report.subjectType === 'Resident' ? 'bold' : 'normal' }}>
            Resident
          </span>
          <span style={{ textDecoration: report.subjectType === 'Non-Resident' ? 'underline' : 'none', fontWeight: report.subjectType === 'Non-Resident' ? 'bold' : 'normal' }}>
            Non-Resident
          </span>
          <span style={{ textDecoration: report.subjectType === 'Employee' ? 'underline' : 'none', fontWeight: report.subjectType === 'Employee' ? 'bold' : 'normal' }}>
            Employee
          </span>
        </div>

        {/* Name and incident info row */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: '6px', fontSize: '11px' }}>
          <tbody>
            <tr>
              <td style={{ width: '13%', padding: '3px 4px', verticalAlign: 'bottom' }}>Last Name</td>
              <td style={{ width: '13%', padding: '3px 4px', verticalAlign: 'bottom' }}>First</td>
              <td style={{ width: '8%', padding: '3px 4px', verticalAlign: 'bottom' }}>Initial</td>
              <td style={{ width: '26%', padding: '3px 4px', verticalAlign: 'bottom' }}>Description</td>
              <td style={{ width: '20%', padding: '3px 4px', verticalAlign: 'bottom' }}>INCIDENT Date/ Time</td>
              <td style={{ width: '20%', padding: '3px 4px', verticalAlign: 'bottom' }}>REPORT Date/ Time</td>
            </tr>
            <tr>
              <td style={{ padding: '4px', fontWeight: 'bold', fontSize: '13px', borderBottom: '1px solid #000', verticalAlign: 'top', ...wrapText }}>
                {report.lastName || ''}
              </td>
              <td style={{ padding: '4px', fontWeight: 'bold', fontSize: '13px', borderBottom: '1px solid #000', verticalAlign: 'top', ...wrapText }}>
                {report.firstName || ''}
              </td>
              <td style={{ padding: '4px', borderBottom: '1px solid #000', verticalAlign: 'top', ...wrapText }}>
                {report.initial || ''}
              </td>
              <td style={{ padding: '4px', fontWeight: 'bold', fontSize: '12px', borderBottom: '1px solid #000', textAlign: 'center', verticalAlign: 'top', ...wrapText }}>
                {report.incidentDescription || ''}
              </td>
              <td style={{ padding: '4px', borderBottom: '1px solid #000', textAlign: 'center', verticalAlign: 'top', ...wrapText }}>
                {incidentDateTime}
              </td>
              <td style={{ padding: '4px', borderBottom: '1px solid #000', textAlign: 'center', verticalAlign: 'top', ...wrapText }}>
                {reportDateTime}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginBottom: '10px', fontSize: '11px', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
          <div style={{ marginBottom: '4px' }}>
            <strong>Incident Types:</strong>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
            {selectedIncidentTypes.length > 0 ? selectedIncidentTypes.map((t) => (
              <span key={t} style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                {t}
              </span>
            )) : (
              <span style={{ color: '#555' }}>None selected</span>
            )}
          </div>
        </div>

        {/* Incident narrative section */}
        <div style={{ marginBottom: '16px', breakInside: 'avoid' }}>
          <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '8px', fontSize: '12px' }}>
            Incident:
          </div>
          <div style={{
            fontSize: '11px',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            minHeight: '120px',
          }}>
            {report.narrativeSummary || ''}
          </div>
        </div>

        {/* Policy Violations (if any) */}
        {report.policyViolations && report.policyViolations.length > 0 && report.policyViolations.some(p => p.description?.trim()) && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '6px', fontSize: '12px' }}>
              Policy Violations:
            </div>
            <div style={{ fontSize: '11px', lineHeight: 1.5, paddingLeft: '12px' }}>
              {report.policyViolations.map((v, i) => (
                <div key={i}>{i + 1}. {v.description}</div>
              ))}
            </div>
          </div>
        )}

        {/* Staff Actions (if any) */}
        {report.staffActions && report.staffActions.length > 0 && report.staffActions.some(a => a.description?.trim()) && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '6px', fontSize: '12px' }}>
              Staff Action Taken:
            </div>
            <div style={{ fontSize: '11px', lineHeight: 1.5, paddingLeft: '12px' }}>
              {report.staffActions.map((a, i) => (
                <div key={i}>{i + 1}. {a.description}</div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-Up (if any) */}
        {report.followUpRecommendations && report.followUpRecommendations.length > 0 && report.followUpRecommendations.some(f => f.description?.trim()) && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '6px', fontSize: '12px' }}>
              Follow-Up / Recommendations:
            </div>
            <div style={{ fontSize: '11px', lineHeight: 1.5, paddingLeft: '12px' }}>
              {report.followUpRecommendations.map((f, i) => (
                <div key={i}>{i + 1}. {f.description}</div>
              ))}
            </div>
          </div>
        )}

        {/* Witnesses */}
        <div style={{ marginBottom: '16px', breakInside: 'avoid' }}>
          <div style={{ fontWeight: 'normal', marginBottom: '8px', fontSize: '12px' }}>
            Witness:
          </div>
          {report.witnesses && report.witnesses.length > 0 && report.witnesses.some(w => w.name.trim()) ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11px' }}>
              <tbody>
                {report.witnesses.filter(w => w.name.trim()).map((w, i) => (
                  <tr key={i}>
                    <td style={{ borderBottom: '1px solid #000', padding: '3px 8px 3px 0', width: '30%', textDecoration: 'underline', verticalAlign: 'top', ...wrapText }}>
                      {w.name}
                    </td>
                    <td style={{ borderBottom: '1px solid #000', padding: '3px 8px', width: '25%', verticalAlign: 'top', ...wrapText }}>
                      {w.address}
                    </td>
                    <td style={{ borderBottom: '1px solid #000', padding: '3px 8px', width: '25%', verticalAlign: 'top', ...wrapText }}>
                      {w.cityState}
                    </td>
                    <td style={{ borderBottom: '1px solid #000', padding: '3px 8px', width: '20%', verticalAlign: 'top', ...wrapText }}>
                      {w.phone}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ borderBottom: '1px solid #000', height: '24px', width: '100%' }} />
          )}
        </div>

        {/* Notifications */}
        <div style={{ marginBottom: '16px', fontSize: '11px', breakInside: 'avoid' }}>
          <div style={{ marginBottom: '4px' }}>Notifications:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
            {selectedNotifications.length > 0 ? selectedNotifications.map((t) => (
              <span key={t} style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                {t}
              </span>
            )) : (
              <span style={{ color: '#555' }}>None documented</span>
            )}
          </div>
        </div>

        {/* Supplementary Information */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', marginBottom: '6px' }}>
            Supplementary Information:
          </div>
          <div style={{
            fontSize: '11px',
            lineHeight: 1.5,
            minHeight: '40px',
            whiteSpace: 'pre-wrap',
          }}>
            {report.supplementaryInfo || ''}
          </div>
        </div>

        {/* Subject address if non-resident */}
        <div style={{ marginBottom: '16px', fontSize: '11px' }}>
          Subject address &amp; phone Number if non-resident
          {(report.subjectAddress || report.subjectPhone) && (
            <div style={{ marginTop: '4px' }}>
              {report.subjectAddress}{report.subjectAddress && report.subjectPhone ? ' — ' : ''}{report.subjectPhone}
            </div>
          )}
        </div>

        {/* Documentation checklist */}
        <div style={{ marginBottom: '24px', fontSize: '11px', breakInside: 'avoid' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            {/* Left column */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ marginBottom: '4px' }}>Yes &nbsp; No</div>
              {LEFT_DOCS.map(d => (
                <div key={d} style={{ marginBottom: '4px', ...wrapText }}>
                  <span style={{ display: 'inline-block', width: '28px', textAlign: 'center', borderBottom: '1px solid #999' }}>
                    {isCheckedDoc(d) ? 'X' : ''}
                  </span>
                  <span style={{ display: 'inline-block', width: '28px', textAlign: 'center', borderBottom: '1px solid #999', marginLeft: '4px' }}>
                    {isCheckedDoc(d) ? '' : 'X'}
                  </span>
                  {' '}{d}
                </div>
              ))}
            </div>
            {/* Right column */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ marginBottom: '4px' }}>Yes &nbsp; No</div>
              {RIGHT_DOCS.map(d => (
                <div key={d} style={{ marginBottom: '4px', ...wrapText }}>
                  <span style={{ display: 'inline-block', width: '28px', textAlign: 'center', borderBottom: '1px solid #999' }}>
                    {isCheckedDoc(d) ? 'X' : ''}
                  </span>
                  <span style={{ display: 'inline-block', width: '28px', textAlign: 'center', borderBottom: '1px solid #999', marginLeft: '4px' }}>
                    {isCheckedDoc(d) ? '' : 'X'}
                  </span>
                  {' '}{d}
                </div>
              ))}
              <div style={{ marginBottom: '4px', ...wrapText }}>
                <span style={{ display: 'inline-block', width: '28px', textAlign: 'center', borderBottom: '1px solid #999' }}>
                  {isCheckedDoc('Other') ? 'X' : ''}
                </span>
                <span style={{ display: 'inline-block', width: '28px', textAlign: 'center', borderBottom: '1px solid #999', marginLeft: '4px' }}>
                  {isCheckedDoc('Other') ? '' : 'X'}
                </span>
                {' '}Other: {report.otherDocumentation || ''}
              </div>
            </div>
          </div>
        </div>

        {/* Signature line */}
        <div style={{ marginTop: '40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px 16px', fontSize: '11px', borderTop: '1px solid #999', paddingTop: '16px', breakInside: 'avoid' }}>
          <div style={{ flex: '1 1 240px' }}>
            Submitted By: <span style={{
              display: 'inline-block',
              width: '200px',
              minHeight: '22px',
              borderBottom: '1px solid #000',
              fontFamily: "'Brush Script MT', 'Segoe Script', 'Lucida Handwriting', cursive",
              fontSize: '20px',
              lineHeight: 1.1,
              padding: '0 4px',
              verticalAlign: 'bottom',
            }}>
              {submittedSignature}
            </span>
          </div>
          <div style={{ flex: '1 1 240px', textAlign: 'center' }}>
            Reviewed By: <span style={{ display: 'inline-block', width: '200px', borderBottom: '1px solid #000' }}>
              {report.reviewedBy || ''}
            </span>
          </div>
          <div style={{ flex: '0 1 120px' }}>
            Date: <span style={{ display: 'inline-block', width: '100px', borderBottom: '1px solid #000' }}>
              {signatureDate ? formatDate(signatureDate) : ''}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          paddingTop: '8px',
          borderTop: '1px solid #999',
          textAlign: 'center',
          fontSize: '9px',
          color: '#666',
        }}>
          <div><strong>CONFIDENTIAL</strong> — This document contains sensitive information pertaining to the care and treatment of a minor.</div>
          <div>Unauthorized distribution is prohibited. Retain in accordance with facility record-keeping policy.</div>
          <div style={{ marginTop: '4px', color: '#999' }}>
            Heartland Boys Home &bull; 914 Road P &bull; Geneva, NE &bull; (402) 759-4334
          </div>
        </div>
      </div>
    )
  }
)

FacilityIncidentPrintView.displayName = 'FacilityIncidentPrintView'

export default FacilityIncidentPrintView
