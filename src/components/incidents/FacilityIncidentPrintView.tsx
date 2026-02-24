import React from 'react'
import { format } from 'date-fns'
import type { FacilityIncidentReport } from '@/types/facility-incident-types'

interface Props {
  report: FacilityIncidentReport
}

/**
 * Professional print-ready incident report layout for Heartland Boys Home.
 * This component renders pure HTML/CSS optimized for PDF export via html2pdf.
 */
const FacilityIncidentPrintView = React.forwardRef<HTMLDivElement, Props>(
  ({ report }, ref) => {
    const formatDate = (d: string) => {
      try {
        return format(new Date(d), 'MMMM d, yyyy')
      } catch {
        return d
      }
    }

    const formatTime = (t: string) => {
      if (!t) return ''
      try {
        const [h, m] = t.split(':')
        const hour = parseInt(h, 10)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        return `${h12}:${m} ${ampm}`
      } catch {
        return t
      }
    }

    return (
      <div
        ref={ref}
        style={{
          fontFamily: "'Times New Roman', 'Georgia', serif",
          color: '#1a1a1a',
          lineHeight: 1.5,
          maxWidth: '8.5in',
          margin: '0 auto',
          padding: '0.25in',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Header with logo area and title */}
        <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '3px double #8B0000', paddingBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#8B0000', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
            Heartland Boys Home
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '2px' }}>
            INCIDENT REPORT
          </div>
          {report.youthName && (
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
              {report.youthName.toUpperCase()}
            </div>
          )}
        </div>

        {/* Report ID and date bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          backgroundColor: '#f5f0eb',
          padding: '6px 12px',
          fontSize: '10px',
          marginBottom: '16px',
          border: '1px solid #d4c5b0',
        }}>
          <span><strong>Report ID:</strong> {report.id}</span>
          <span><strong>Generated:</strong> {format(new Date(), 'MMMM d, yyyy h:mm a')}</span>
        </div>

        {/* Section 1: Incident Details Table */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            backgroundColor: '#8B0000',
            color: '#ffffff',
            padding: '5px 10px',
            fontSize: '11px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            Incident Details
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={cellLabelStyle}>Date of Incident</td>
                <td style={cellValueStyle}>{report.dateOfIncident ? formatDate(report.dateOfIncident) : '—'}</td>
                <td style={cellLabelStyle}>Time of Incident</td>
                <td style={cellValueStyle}>{report.timeOfIncident ? formatTime(report.timeOfIncident) : '—'}</td>
              </tr>
              <tr>
                <td style={cellLabelStyle}>Staff Completing Report</td>
                <td style={cellValueStyle}>{report.staffCompletingReport || '—'}</td>
                <td style={cellLabelStyle}>Location</td>
                <td style={cellValueStyle}>{report.location || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Youth Involved */}
        {report.youthInvolved && report.youthInvolved.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={sectionHeaderStyle}>Youth Involved</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={{ ...thStyle, width: '80px' }}>Age</th>
                  <th style={{ ...thStyle, width: '120px' }}>Role</th>
                </tr>
              </thead>
              <tbody>
                {report.youthInvolved.map((y, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{y.name}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{y.age}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', textTransform: 'capitalize' }}>{y.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 3: Type of Incident */}
        {report.incidentTypes && report.incidentTypes.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={sectionHeaderStyle}>Type of Incident</div>
            <div style={{
              border: '1px solid #ccc',
              padding: '8px 12px',
              fontSize: '11px',
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                {report.incidentTypes.map((type, i) => (
                  <span key={i} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      border: '1.5px solid #8B0000',
                      backgroundColor: '#8B0000',
                      marginRight: '3px',
                    }} />
                    {type}
                    {type === 'Other' && report.otherIncidentType ? `: ${report.otherIncidentType}` : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Narrative Summary */}
        <div style={{ marginBottom: '16px' }}>
          <div style={sectionHeaderStyle}>Narrative Summary</div>
          <div style={{
            border: '1px solid #ccc',
            padding: '10px 12px',
            fontSize: '11px',
            whiteSpace: 'pre-wrap',
            minHeight: '60px',
            lineHeight: 1.6,
          }}>
            {report.narrativeSummary || '—'}
          </div>
        </div>

        {/* Section 5: Policy Violations */}
        {report.policyViolations && report.policyViolations.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={sectionHeaderStyle}>Policy Violations</div>
            <div style={{ border: '1px solid #ccc', padding: '8px 12px', fontSize: '11px' }}>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                {report.policyViolations.map((v, i) => (
                  <li key={i} style={{ marginBottom: '3px' }}>{v.description}</li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* Section 6: Staff Action Taken */}
        {report.staffActions && report.staffActions.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={sectionHeaderStyle}>Staff Action Taken</div>
            <div style={{ border: '1px solid #ccc', padding: '8px 12px', fontSize: '11px' }}>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                {report.staffActions.map((a, i) => (
                  <li key={i} style={{ marginBottom: '3px' }}>{a.description}</li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* Section 7: Follow-Up / Recommendations */}
        {report.followUpRecommendations && report.followUpRecommendations.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={sectionHeaderStyle}>Follow-Up / Recommendations</div>
            <div style={{ border: '1px solid #ccc', padding: '8px 12px', fontSize: '11px' }}>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                {report.followUpRecommendations.map((f, i) => (
                  <li key={i} style={{ marginBottom: '3px' }}>{f.description}</li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* Signature Block */}
        <div style={{ marginTop: '32px', borderTop: '1px solid #ccc', paddingTop: '16px' }}>
          <div style={sectionHeaderStyle}>Signatures</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={{ ...cellLabelStyle, width: '180px' }}>Staff Signature</td>
                <td style={{ ...cellValueStyle, borderBottom: '1px solid #333', minHeight: '30px', height: '30px' }}>&nbsp;</td>
                <td style={{ ...cellLabelStyle, width: '80px' }}>Date</td>
                <td style={{ ...cellValueStyle, borderBottom: '1px solid #333', width: '160px' }}>&nbsp;</td>
              </tr>
              <tr><td colSpan={4} style={{ height: '16px' }}>&nbsp;</td></tr>
              <tr>
                <td style={{ ...cellLabelStyle, width: '180px' }}>Supervisor Signature</td>
                <td style={{ ...cellValueStyle, borderBottom: '1px solid #333', minHeight: '30px', height: '30px' }}>&nbsp;</td>
                <td style={{ ...cellLabelStyle, width: '80px' }}>Date</td>
                <td style={{ ...cellValueStyle, borderBottom: '1px solid #333', width: '160px' }}>&nbsp;</td>
              </tr>
              <tr><td colSpan={4} style={{ height: '16px' }}>&nbsp;</td></tr>
              <tr>
                <td style={{ ...cellLabelStyle, width: '180px' }}>Administrator Signature</td>
                <td style={{ ...cellValueStyle, borderBottom: '1px solid #333', minHeight: '30px', height: '30px' }}>&nbsp;</td>
                <td style={{ ...cellLabelStyle, width: '80px' }}>Date</td>
                <td style={{ ...cellValueStyle, borderBottom: '1px solid #333', width: '160px' }}>&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          paddingTop: '8px',
          borderTop: '2px solid #8B0000',
          textAlign: 'center',
          fontSize: '9px',
          color: '#666',
        }}>
          <div><strong>CONFIDENTIAL</strong> — This document contains sensitive information pertaining to the care and treatment of a minor.</div>
          <div>Unauthorized distribution is prohibited. Retain in accordance with facility record-keeping policy.</div>
          <div style={{ marginTop: '4px', color: '#999' }}>
            Heartland Boys Home &bull; Incident Report &bull; Page 1 of 1
          </div>
        </div>
      </div>
    )
  }
)

FacilityIncidentPrintView.displayName = 'FacilityIncidentPrintView'

// Shared inline styles for the table cells
const cellLabelStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontWeight: 'bold',
  backgroundColor: '#f9f6f3',
  border: '1px solid #ccc',
  width: '180px',
  verticalAlign: 'top',
}

const cellValueStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #ccc',
  verticalAlign: 'top',
}

const sectionHeaderStyle: React.CSSProperties = {
  backgroundColor: '#8B0000',
  color: '#ffffff',
  padding: '5px 10px',
  fontSize: '11px',
  fontWeight: 'bold',
  textTransform: 'uppercase',
  letterSpacing: '1px',
}

const thStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontWeight: 'bold',
  backgroundColor: '#f9f6f3',
  border: '1px solid #ccc',
  textAlign: 'left',
  fontSize: '10px',
  textTransform: 'uppercase',
}

const tdStyle: React.CSSProperties = {
  padding: '5px 10px',
  border: '1px solid #ccc',
  verticalAlign: 'top',
}

export default FacilityIncidentPrintView
