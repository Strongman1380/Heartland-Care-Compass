import { Youth } from '@/types/app-types';
import { format } from 'date-fns';
import { resolveProfessionals, PROFESSIONAL_TYPE_LABELS } from './professionalUtils';

/**
 * Open the youth profile sheet in a new window for printing (or Save as PDF via browser print dialog)
 */
export const printYouthProfile = (youth: Youth): void => {
  const html = generateProfileHTML(youth);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups for this site.');
  }
  printWindow.document.write(html);
  printWindow.document.close();
  // Wait for content (and any images) to load before triggering print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};

/** @deprecated Use printYouthProfile instead */
export const generateProfilePDF = async (youth: Youth): Promise<void> => {
  printYouthProfile(youth);
};

/**
 * Generate HTML for the youth profile sheet
 */
const generateProfileHTML = (youth: Youth): string => {
  // Helper functions for safe data display
  const safe = (value: any): string => {
    if (value === null || value === undefined || value === '') return 'Not provided';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.filter(Boolean).join(', ') || 'Not provided';
    return String(value);
  };

  const esc = (str: string): string => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
  };

  const fmt = (date: string | Date | null): string => {
    if (!date) return 'Not provided';
    try {
      return format(new Date(date), 'MM/dd/yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const safePre = (value: any): string => {
    const safeValue = safe(value);
    return safeValue === 'Not provided' ? safeValue : `<div style="white-space: pre-wrap; word-wrap: break-word;">${esc(safeValue)}</div>`;
  };

  // Photo handling
  const photoBox = (() => {
    if (youth.profilePhoto) {
      const photoSrc = youth.profilePhoto.startsWith('data:') ? youth.profilePhoto : `data:image/jpeg;base64,${youth.profilePhoto}`;
      return `<img src="${photoSrc}" alt="Youth Photo" style="width:144pt; height:180pt; border:1pt solid #000; object-fit:cover;">`;
    }
    return `<div style="width:144pt; height:180pt; border:1pt solid #000; display:flex; align-items:center; justify-content:center; font-size:10pt; color:#000; background:#f9f9f9;">Photo</div>`;
  })();

  // Logo handling
  const logoBox = `<img src="/assets/heartland-logo.png" alt="Heartland Boys Home" style="height:60pt; max-width:200pt; object-fit:contain;">`;

  // Table helper functions
  const tableWithHeaderOpen = (title: string) => `
    <table class="section-table" style="width:100%; border-collapse:collapse; font-size:10.5pt; margin-top:12pt; color:#000;">
      <thead style="display: table-header-group;">
        <tr>
          <th colspan="2" style="text-align:left; font-weight:bold; background:#fdf2f2; border:1pt solid #823131; padding:6pt 8pt; color:#823131;">${esc(title)}</th>
        </tr>
      </thead>
      <tbody>`;
  
  const tableClose = `</tbody></table>`;
  
  const th = (label: string) => `<td style="width:35%; border:1pt solid #999; padding:6pt 8pt; background:#fef9f0; font-weight:bold; vertical-align:top; color:#000;">${esc(label)}</td>`;

  const td = (value: string) => `<td style="border:1pt solid #999; padding:6pt 8pt; vertical-align:top; word-wrap:break-word; word-break:break-word; color:#000;">${value}</td>`;
  
  const row = (label: string, value: string) => `<tr>${th(label)}${td(value)}</tr>`;

  // Generate the complete HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Youth Profile - ${youth.firstName} ${youth.lastName}</title>
      <style>
        @page {
          size: Letter;
          margin: 36pt;
          @bottom-right {
            content: "Page " counter(page);
            font-size: 9pt;
            color: #000;
          }
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          font-size: 11pt;
          line-height: 1.4;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20pt;
          padding-bottom: 12pt;
          border-bottom: 2pt solid #823131;
          page-break-after: avoid;
        }
        .header-left {
          flex: 1;
        }
        .header-right {
          flex: 0 0 auto;
        }
        .title {
          font-size: 18pt;
          font-weight: bold;
          color: #823131;
          margin: 0 0 4pt 0;
        }
        .subtitle {
          font-size: 12pt;
          color: #333;
          margin: 0;
        }
        .basic-info-section {
          display: flex;
          gap: 16pt;
          align-items: flex-start;
          margin-bottom: 16pt;
          page-break-inside: avoid;
        }
        .basic-info-table {
          flex: 1;
          min-width: 300pt;
        }
        .photo-container {
          flex: 0 0 auto;
          page-break-inside: avoid;
        }
        .section-table { 
          width: 100%;
          border-collapse: collapse;
        }
        .section-table tr, .section-table td, .section-table th { 
          page-break-inside: avoid; 
        }
        .section-table thead { 
          display: table-header-group; 
        }
        .section-table thead th {
          background: #fdf2f2 !important;
          color: #823131 !important;
          font-weight: bold;
          padding: 6pt 8pt;
          border: 1pt solid #823131;
        }
        .section-table td {
          padding: 6pt 8pt;
          vertical-align: top;
          word-wrap: break-word;
          word-break: break-word;
          border: 1pt solid #999;
          color: #000;
        }
        .section-table td:first-child {
          background: #fef9f0;
          font-weight: bold;
          width: 35%;
          color: #000;
        }
        h1, h2, h3 {
          margin: 0 0 8pt;
          page-break-after: avoid;
          color: #823131;
        }
        .footer {
          margin-top: 20pt;
          padding-top: 12pt;
          border-top: 1pt solid #999;
          font-size: 9pt;
          color: #333;
          text-align: center;
        }
        /* Prevent orphaned content */
        p, div {
          orphans: 2;
          widows: 2;
        }
      </style>
    </head>
    <body>
      <!-- Header with Logo and Title -->
      <div class="header">
        <div class="header-left">
          <h1 class="title">YOUTH PROFILE SHEET</h1>
          <p class="subtitle">Heartland Boys Home - Confidential Document</p>
        </div>
        <div class="header-right">
          ${logoBox}
        </div>
      </div>

      <!-- Basic Information with Photo -->
      <div class="basic-info-section">
        <div class="basic-info-table">
          <table class="section-table">
            <thead>
              <tr>
                <th colspan="2">RESIDENT IDENTIFICATION</th>
              </tr>
            </thead>
            <tbody>
              ${row('Full Name', `${esc(youth.firstName || '')} ${esc(youth.lastName || '')}`)}
              ${row('ID Number', safe(youth.idNumber || youth.id))}
              ${row('Date of Birth', fmt(youth.dob))}
              ${row('Age', safe(youth.age))}
              ${row('Sex', safe(youth.sex))}
              ${row('Race/Ethnicity', safe(youth.race))}
              ${row('Place of Birth', safe(youth.placeOfBirth))}
            </tbody>
          </table>
        </div>
        <div class="photo-container">
          ${photoBox}
        </div>
      </div>

      <!-- Address Information -->
      ${tableWithHeaderOpen('CONTACT INFORMATION')}
        ${row('Home Address', safe([youth.address?.street, youth.address?.city, youth.address?.state, youth.address?.zip].filter(Boolean).join(', ')))}
        ${row('Phone Number', safe(youth.phoneNumber))}
        ${row('Email Address', safe(youth.email))}
      ${tableClose}

      <!-- Admission Information -->
      ${tableWithHeaderOpen('ADMISSION & STATUS')}
        ${row('Admission Date', fmt(youth.admissionDate))}
        ${row('Admission Time', safe(youth.admissionTime))}
        ${row('RCS In', safe(youth.rcsIn))}
        ${row('Current Level', safe(youth.level))}
        ${row('Legal Status', safe(youth.legalStatus))}
        ${row('Estimated Length of Stay', safe(youth.dischargePlan?.estimatedLengthOfStayMonths ? youth.dischargePlan.estimatedLengthOfStayMonths + ' months' : null))}
      ${tableClose}

      <!-- Guardian Information -->
      ${tableWithHeaderOpen('GUARDIAN & FAMILY CONTACTS')}
        ${row('Legal Guardian', safe(typeof youth.legalGuardian === 'object' ? `${youth.legalGuardian?.name || ''}${youth.legalGuardian?.phone ? ' — ' + youth.legalGuardian?.phone : ''}` : youth.legalGuardian))}
        ${row('Mother', safe([youth.mother?.name, youth.mother?.phone].filter(Boolean).join(' — ')))}
        ${row('Father', safe([youth.father?.name, youth.father?.phone].filter(Boolean).join(' — ')))}
        ${row('Next of Kin', safe([youth.nextOfKin?.name, youth.nextOfKin?.relationship, youth.nextOfKin?.phone].filter(Boolean).join(' — ')))}
        ${row('Emergency Contact', safe(youth.emergencyContact))}
      ${tableClose}

      <!-- Legal Information -->
      ${tableWithHeaderOpen('LEGAL & PLACEMENT INFORMATION')}
        ${row('Placing Agency/County', safe(youth.placingAgencyCounty))}
        ${(() => {
          const profs = resolveProfessionals(youth);
          if (profs.length === 0) return row('Professionals', 'None assigned');
          return profs.map(p => {
            const details = [p.name, p.phone, p.email].filter(Boolean).join(' — ');
            return row(PROFESSIONAL_TYPE_LABELS[p.type], safe(details));
          }).join('');
        })()}
      ${tableClose}

      <!-- Physical Description -->
      ${tableWithHeaderOpen('PHYSICAL DESCRIPTION')}
        ${row('Height', safe(youth.physicalDescription?.height))}
        ${row('Weight', safe(youth.physicalDescription?.weight))}
        ${row('Hair Color', safe(youth.physicalDescription?.hairColor))}
        ${row('Eye Color', safe(youth.physicalDescription?.eyeColor))}
        ${row('Identifying Marks/Tattoos/Scars', safePre(youth.physicalDescription?.tattoosScars))}
      ${tableClose}

      <!-- Health Information -->
      ${tableWithHeaderOpen('HEALTH & MEDICAL INFORMATION')}
        ${row('Allergies', safePre(youth.allergies))}
        ${row('Current Medications', safePre(youth.currentMedications))}
        ${row('Significant Health Conditions', safePre(youth.significantHealthConditions))}
        ${row('Religion', safe(youth.religion))}
      ${tableClose}

      <!-- Education Information -->
      ${tableWithHeaderOpen('EDUCATION INFORMATION')}
        ${row('Last School Attended', safe(youth.lastSchoolAttended))}
        ${row('Current Grade', safe(youth.currentGrade))}
        ${row('Has IEP', safe(youth.hasIEP))}
      ${tableClose}

      <!-- Mental Health Information -->
      ${tableWithHeaderOpen('MENTAL HEALTH & BEHAVIORAL INFORMATION')}
        ${row('Get Along With Others', safePre(youth.getAlongWithOthers))}
        ${row('Behavioral Strengths/Talents', safePre(youth.strengthsTalents))}
        ${row('Interests', safePre(youth.interests))}
        ${row('Behavioral Concerns/Problems', safePre(youth.behaviorProblems))}
        ${row('Dislikes About Self', safePre(youth.dislikesAboutSelf))}
        ${row('Anger Triggers', safePre(youth.angerTriggers))}
        ${row('History of Physically Hurting Others', safe(youth.historyPhysicallyHurting))}
        ${row('History of Vandalism', safe(youth.historyVandalism))}
        ${row('Gang Involvement', safe(youth.gangInvolvement))}
        ${row('Family History of Violent Crimes', safe(youth.familyViolentCrimes))}
      ${tableClose}

      <!-- Substance Use -->
      ${tableWithHeaderOpen('SUBSTANCE USE HISTORY')}
        ${row('Tobacco Use (past 6-12 months)', safe(youth.tobaccoPast6To12Months))}
        ${row('Alcohol Use (past 6-12 months)', safe(youth.alcoholPast6To12Months))}
        ${row('Drug/Vaping/Marijuana Use (past 6-12 months)', safe(youth.drugsVapingMarijuanaPast6To12Months))}
        ${row('Drug Testing Dates', safePre(youth.drugTestingDates))}
      ${tableClose}

      <!-- Discharge Planning -->
      ${tableWithHeaderOpen('DISCHARGE PLANNING')}
        ${row('Planned Discharge to Parents', safePre(youth.dischargePlan?.parents))}
        ${row('Relative Placement', safe([youth.dischargePlan?.relative?.name, youth.dischargePlan?.relative?.relationship].filter(Boolean).join(' — ')))}
        ${row('Foster Care Consideration', safe(youth.dischargePlan?.regularFosterCare))}
        ${row('Estimated Length of Stay', safe(youth.dischargePlan?.estimatedLengthOfStayMonths ? youth.dischargePlan.estimatedLengthOfStayMonths + ' months' : null))}
      ${tableClose}

      <!-- Community Resources -->
      ${tableWithHeaderOpen('COMMUNITY RESOURCES USED')}
        ${row('Day Treatment Services', safe(youth.communityResources?.dayTreatmentServices))}
        ${row('Intensive In-Home Services', safe(youth.communityResources?.intensiveInHomeServices))}
        ${row('Day School Placement', safe(youth.communityResources?.daySchoolPlacement))}
        ${row('One-on-One School Counselor', safe(youth.communityResources?.oneOnOneSchoolCounselor))}
        ${row('Mental Health Support Services', safe(youth.communityResources?.mentalHealthSupportServices))}
        ${row('Other Community Resources', safePre(youth.communityResources?.other))}
      ${tableClose}

      <!-- Treatment Focus -->
      ${tableWithHeaderOpen('DESIRED FOCUS OF TREATMENT')}
        ${row('Excessive Dependency', safe(youth.treatmentFocus?.excessiveDependency))}
        ${row('Withdrawal/Isolation', safe(youth.treatmentFocus?.withdrawalIsolation))}
        ${row('Parent/Child Relationship', safe(youth.treatmentFocus?.parentChildRelationship))}
        ${row('Peer Relationship', safe(youth.treatmentFocus?.peerRelationship))}
        ${row('Acceptance of Authority', safe(youth.treatmentFocus?.acceptanceOfAuthority))}
        ${row('Lying', safe(youth.treatmentFocus?.lying))}
        ${row('Poor Academic Achievement', safe(youth.treatmentFocus?.poorAcademicAchievement))}
        ${row('Poor Self-Esteem', safe(youth.treatmentFocus?.poorSelfEsteem))}
        ${row('Manipulative Behavior', safe(youth.treatmentFocus?.manipulative))}
        ${row('Property Destruction', safe(youth.treatmentFocus?.propertyDestruction))}
        ${row('Hyperactivity', safe(youth.treatmentFocus?.hyperactivity))}
        ${row('Anxiety', safe(youth.treatmentFocus?.anxiety))}
        ${row('Verbal Aggression', safe(youth.treatmentFocus?.verbalAggression))}
        ${row('Assaultive Behavior', safe(youth.treatmentFocus?.assaultive))}
        ${row('Depression', safe(youth.treatmentFocus?.depression))}
        ${row('Stealing', safe(youth.treatmentFocus?.stealing))}
      ${tableClose}

      <!-- Emergency Shelter Care -->
      ${tableWithHeaderOpen('EMERGENCY SHELTER CARE')}
        ${row('Legal Guardian Information', safePre(youth.emergencyShelterCare?.legalGuardianInfo))}
        ${row('Parents Notified', safe(youth.emergencyShelterCare?.parentsNotified))}
        ${row('Immediate Needs', safePre(youth.emergencyShelterCare?.immediateNeeds))}
        ${row('Placing Agency Individual', safe(youth.emergencyShelterCare?.placingAgencyIndividual))}
        ${row('Placement Date', fmt(youth.emergencyShelterCare?.placementDate))}
        ${row('Placement Time', safe(youth.emergencyShelterCare?.placementTime))}
        ${row('Reason for Placement', safePre(youth.emergencyShelterCare?.reasonForPlacement))}
        ${row('Intake Worker Observation', safePre(youth.emergencyShelterCare?.intakeWorkerObservation))}
        ${row('Orientation Completed By', safe(youth.emergencyShelterCare?.orientationCompletedBy))}
        ${row('Orientation Date', fmt(youth.emergencyShelterCare?.orientationDate))}
        ${row('Orientation Time', safe(youth.emergencyShelterCare?.orientationTime))}
      ${tableClose}

      <!-- Footer -->
      <div class="footer">
        <p><strong>CONFIDENTIAL DOCUMENT</strong> - This information is protected by privacy laws and regulations</p>
        <p>Generated on ${format(new Date(), 'MMMM dd, yyyy')} at ${format(new Date(), 'h:mm a')}</p>
        <p>Heartland Boys Home | Youth Profile Sheet</p>
      </div>
    </body>
    </html>
  `;
};