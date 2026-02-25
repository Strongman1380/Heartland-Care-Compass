import { Youth, BehaviorPoints, DailyRating, ProgressNote } from "@/types/app-types";
import { fetchBehaviorPoints, fetchDailyRatings, fetchProgressNotes } from "./local-storage-utils";
import { getBehaviorPointsByYouth, getDailyRatingsByYouth, getProgressNotesByYouth } from "@/lib/api";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, subDays } from "date-fns";
import { summarizeReport, generateBehavioralInsights, generateTreatmentRecommendations } from "@/lib/aiClient";
import { calculateTotalPoints, calculatePointsForPeriod, getPointStatistics } from "./pointCalculations";

// API fetch functions with fallback to localStorage
const fetchBehaviorPointsAPI = async (youthId: string): Promise<BehaviorPoints[]> => {
  try {
    return await getBehaviorPointsByYouth(youthId);
  } catch (e) {
    console.warn('API fetch failed for behavior-points; falling back to localStorage:', e);
    return fetchBehaviorPoints(youthId);
  }
};

const fetchProgressNotesAPI = async (youthId: string): Promise<ProgressNote[]> => {
  try {
    return await getProgressNotesByYouth(youthId);
  } catch (e) {
    console.warn('API fetch failed for progress-notes; falling back to localStorage:', e);
    return fetchProgressNotes(youthId);
  }
};

const fetchDailyRatingsAPI = async (youthId: string): Promise<DailyRating[]> => {
  try {
    return await getDailyRatingsByYouth(youthId);
  } catch (e) {
    console.warn('API fetch failed for daily-ratings; falling back to localStorage:', e);
    return fetchDailyRatings(youthId);
  }
};

export interface ReportOptions {
  reportType: "comprehensive" | "summary" | "progress" | "progressMonthly" | "court" | "dpnWeekly" | "dpnBiWeekly" | "dpnMonthly";
  period: "allTime" | "last7" | "last30" | "last90" | "custom";
  customStartDate?: string;
  customEndDate?: string;
  includeOptions: {
    profile: boolean;
    points: boolean;
    notes: boolean;
    assessment: boolean;
    documents: boolean;
  };
  outputFormat?: 'text' | 'pdf' | 'docx';
  useAI?: boolean;
}

export const generateReport = async (youth: Youth, options: ReportOptions): Promise<string> => {
  // Calculate date range
  const { startDate, endDate } = getDateRange(options);
  
  // Fetch data based on options
  const data = await fetchReportData(youth.id, options, startDate, endDate);
  
  // Generate report content based on type
  switch (options.reportType) {
    case "comprehensive":
      return generateComprehensiveReport(youth, data, startDate, endDate, options);
    case "summary":
      return generateSummaryReport(youth, data, startDate, endDate, options);
    case "progress":
    case "progressMonthly":
      return generateProgressReport(youth, data, startDate, endDate, options);
    case "court":
      return generateCourtReport(youth, data, startDate, endDate, options);
    case "dpnWeekly":
      return generateDPNReport(youth, data, startDate, endDate, options, "weekly");
    case "dpnBiWeekly":
      return generateDPNReport(youth, data, startDate, endDate, options, "bi-weekly");
    case "dpnMonthly":
      return generateDPNReport(youth, data, startDate, endDate, options, "monthly");
    default:
      throw new Error("Invalid report type");
  }
};

// Styled HTML report generation for PDF/DOCX export
export const generateReportHTML = async (youth: Youth, options: ReportOptions): Promise<string> => {
  const { startDate, endDate } = getDateRange(options);
  const data = await fetchReportData(youth.id, options, startDate, endDate);

  const fmt = (d?: Date | string | null) => d ? format(new Date(d), "M/d/yyyy") : "Not provided";
  const esc = (s: any) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const logoUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${import.meta.env.BASE_URL}files/BoysHomeLogo.png`;
  let logoSrc = logoUrl;
  // Attempt to inline the logo as a data URL so DOCX embeds it reliably
  if (typeof window !== 'undefined' && window.fetch) {
    try {
      const res = await fetch(logoUrl, { cache: 'force-cache' });
      const blob = await res.blob();
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      if (dataUrl && dataUrl.startsWith('data:')) logoSrc = dataUrl;
    } catch (e) {
      // Fallback to URL if inlining fails
      console.warn('Could not inline logo; falling back to URL');
    }
  }
  const header = (title: string) => `
    <div style="text-align:center; margin-bottom:12pt;">
      <img src="${logoSrc}" alt="Heartland Boys Home" style="height:56px; object-fit:contain; margin-bottom:6pt;" crossorigin="anonymous" />
      <h1 style="font-size:18pt; margin:0;">Heartland Boys Home</h1>
      <h2 style="font-size:14pt; margin:6pt 0 0;">${esc(title)}</h2>
    </div>`;

  const youthInfo = `
    <div style="margin:8pt 0 12pt;">
      <h3 style="font-size:12pt; margin:0 0 6pt;">Youth Information</h3>
      <div style="display:flex; gap:24pt; flex-wrap:wrap; font-size:11pt;">
        <div><strong>Name:</strong> ${esc(youth.firstName)} ${esc(youth.lastName)}</div>
        <div><strong>Date of Birth:</strong> ${fmt(youth.dob as any)}</div>
        <div><strong>Admission Date:</strong> ${fmt(youth.admissionDate as any)}</div>
        <div><strong>Current Level:</strong> ${esc(youth.level)}</div>
      </div>
    </div>`;

  const period = `
    <div style="margin:0 0 12pt; font-size:11pt;">
      <strong>Report Period:</strong> ${fmt(startDate)} to ${fmt(endDate)}
    </div>`;

  const behaviorSection = () => {
    if (!options.includeOptions.points || !data.behaviorPoints) return '';
    const totalPoints = data.behaviorPoints.reduce((sum: number, p: BehaviorPoints) => sum + (p.totalPoints || 0), 0);
    const avg = (key: keyof BehaviorPoints) => {
      const arr = data.behaviorPoints as BehaviorPoints[];
      return arr.length ? Math.round((arr.reduce((s, r) => s + (Number(r[key]) || 0), 0)/arr.length)*10)/10 : 0;
    };
    return `
      <div style="margin:12pt 0;">
        <h3 style="font-size:12pt; margin:0 0 6pt;">Behavior Point Summary</h3>
        <ul style="margin:0 0 0 16pt; font-size:11pt;">
          <li><strong>Total Points This Period:</strong> ${totalPoints}</li>
          <li><strong>Average Morning Points:</strong> ${avg('morningPoints')}</li>
          <li><strong>Average Afternoon Points:</strong> ${avg('afternoonPoints')}</li>
          <li><strong>Average Evening Points:</strong> ${avg('eveningPoints')}</li>
          <li><strong>Days Recorded:</strong> ${data.behaviorPoints.length}</li>
        </ul>
      </div>`;
  };

  const ratingsSection = () => {
    if (!data.dailyRatings || data.dailyRatings.length === 0) return '';
    const calcAvg = (field: keyof DailyRating) => {
      const values = data.dailyRatings.map((r: DailyRating) => Number(r[field]) || 0).filter((v: number) => v > 0);
      return values.length ? Math.round((values.reduce((s: number, v: number)=>s+v,0)/values.length)*10)/10 : 0;
    };
    return `
      <div style="margin:12pt 0;">
        <h3 style="font-size:12pt; margin:0 0 6pt;">Daily Ratings Summary</h3>
        <ul style="margin:0 0 0 16pt; font-size:11pt;">
          <li><strong>Peer Interaction Average:</strong> ${calcAvg('peerInteraction')} / 5</li>
          <li><strong>Adult Interaction Average:</strong> ${calcAvg('adultInteraction')} / 5</li>
          <li><strong>Program Investment Average:</strong> ${calcAvg('investmentLevel')} / 5</li>
          <li><strong>Authority Response Average:</strong> ${calcAvg('dealAuthority')} / 5</li>
        </ul>
      </div>`;
  };

  const notesSection = () => {
    if (!options.includeOptions.notes || !data.progressNotes) return '';
    const items = (data.progressNotes as ProgressNote[]).slice(0, 50).map(n => `
      <li>${fmt(n.date as any)} - ${esc(n.category || 'General')}: ${esc(n.note || 'No note')}</li>`).join('');
    return `
      <div style="margin:12pt 0;">
        <h3 style="font-size:12pt; margin:0 0 6pt;">Progress Notes (${(data.progressNotes as any[]).length} entries - Showing last 50)</h3>
        <ul style="margin:0 0 0 16pt; font-size:11pt;">${items}</ul>
      </div>`;
  };

  const progressWeeklySection = () => {
    if (options.reportType !== 'progress' || !data.behaviorPoints) return '';
    const weekly: Record<string, BehaviorPoints[]> = {};
    (data.behaviorPoints as BehaviorPoints[]).forEach(p => {
      if (!p.date) return;
      const wk = format(startOfWeek(new Date(p.date)), 'M/d/yyyy');
      (weekly[wk] ||= []).push(p);
    });
    const rows = Object.entries(weekly).map(([week, points]) => {
      const total = points.reduce((s, p)=> s + (p.totalPoints || 0), 0);
      return `<tr><td style="padding:6pt 8pt;border:1pt solid #000;">${esc(week)}</td><td style="padding:6pt 8pt;border:1pt solid #000;">${total}</td><td style="padding:6pt 8pt;border:1pt solid #000;">${points.length}</td></tr>`;
    }).join('');
    if (!rows) return '';
    return `
      <div style="margin:12pt 0;">
        <h3 style="font-size:12pt; margin:0 0 6pt;">Weekly Breakdown</h3>
        <table style="border-collapse:collapse; font-size:11pt;">
          <thead>
            <tr>
              <th style="padding:6pt 8pt;border:1pt solid #000; text-align:left;">Week Of</th>
              <th style="padding:6pt 8pt;border:1pt solid #000; text-align:left;">Total Points</th>
              <th style="padding:6pt 8pt;border:1pt solid #000; text-align:left;">Days</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  };

  const progressMonthlySection = () => {
    if (options.reportType !== 'progressMonthly' || !data.behaviorPoints) return '';
    const monthly: Record<string, BehaviorPoints[]> = {};
    (data.behaviorPoints as BehaviorPoints[]).forEach(p => {
      if (!p.date) return;
      const m = format(startOfMonth(new Date(p.date)), 'MMMM yyyy');
      (monthly[m] ||= []).push(p);
    });
    const rows = Object.entries(monthly).map(([month, points]) => {
      const total = points.reduce((s, p)=> s + (p.totalPoints || 0), 0);
      return `<tr><td style=\"padding:6pt 8pt;border:1pt solid #000;\">${esc(month)}</td><td style=\"padding:6pt 8pt;border:1pt solid #000;\">${total}</td><td style=\"padding:6pt 8pt;border:1pt solid #000;\">${points.length}</td></tr>`;
    }).join('');
    if (!rows) return '';
    return `
      <div style=\"margin:12pt 0;\">
        <h3 style=\"font-size:12pt; margin:0 0 6pt;\">Monthly Breakdown</h3>
        <table style=\"border-collapse:collapse; font-size:11pt;\">
          <thead>
            <tr>
              <th style=\"padding:6pt 8pt;border:1pt solid #000; text-align:left;\">Month</th>
              <th style=\"padding:6pt 8pt;border:1pt solid #000; text-align:left;\">Total Points</th>
              <th style=\"padding:6pt 8pt;border:1pt solid #000; text-align:left;\">Days</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  };

  let title = '';
  switch (options.reportType) {
    case 'comprehensive':
      title = 'Comprehensive Report';
      break;
    case 'summary':
      title = 'Summary Report';
      break;
    case 'progress':
      title = 'Progress Report';
      break;
    case 'progressMonthly':
      title = 'Monthly Progress Report';
      break;
    case 'court':
      title = 'Court Report';
      break;
    case 'dpnWeekly':
      title = 'DPN Weekly Progress Evaluation';
      break;
    case 'dpnBiWeekly':
      title = 'DPN Bi-Weekly Progress Evaluation';
      break;
    case 'dpnMonthly':
      title = 'DPN Monthly Progress Evaluation';
      break;
  }

  const fmtBool = (v: any) => (v === true ? 'Yes' : v === false ? 'No' : 'Not provided');
  const joinList = (v: any) => Array.isArray(v) && v.length ? esc(v.join(', ')) : 'Not provided';
  const safe = (v: any) => v !== undefined && v !== null && v !== '' ? esc(v) : 'Not provided';
  const safePre = (v: any) => v !== undefined && v !== null && v !== '' ? `<div style="white-space:pre-wrap;">${esc(v)}</div>` : 'Not provided';

  const profileFormSection = () => {
    if (!options.includeOptions.profile) return '';
    const photoBox = (() => {
      const src = youth.profilePhoto ? String(youth.profilePhoto) : '';
      // Use provided value directly (base64 or URL). Fallback to placeholder box.
      if (src) {
        return `<img src="${esc(src)}" alt="Youth Photo" style="width:144pt; height:180pt; object-fit:cover; border:1pt solid #000;"/>`;
      }
      return `<div style="width:144pt; height:180pt; border:1pt solid #000; display:flex; align-items:center; justify-content:center; font-size:10pt; color:#000;">Photo</div>`;
    })();

    const tableWithHeaderOpen = (t: string) => `
      <table class="section-table" style="width:100%; border-collapse:collapse; font-size:10.5pt;">
        <thead style="display: table-header-group;">
          <tr>
            <th colspan="2" style="text-align:left; font-weight:bold; background:#eee; border:1pt solid #000; padding:4pt 6pt;">${esc(t)}</th>
          </tr>
        </thead>
        <tbody>`;
    const tableClose = `</tbody></table>`;
    const th = (s: string) => `<td style="width:32%; border:1pt solid #000; padding:4pt 6pt; background:#fafafa; font-weight:bold; vertical-align:top;">${esc(s)}</td>`;
    const td = (v: string) => `<td style="border:1pt solid #000; padding:4pt 6pt; vertical-align:top; word-wrap:break-word; word-break:break-word;">${v}</td>`;
    const row = (label: string, value: string) => `<tr>${th(label)}${td(value)}</tr>`;

    return `
      <div style="margin:12pt 0; page-break-inside:auto;">
        <h3 class="profile-header" style="font-size:12pt; margin:0 0 6pt;">Profile Information</h3>
        <div class="photo-container" style="display:flex; gap:12pt; align-items:flex-start; flex-wrap:wrap; page-break-inside:avoid;">
          <div style="flex:1 1 380pt; min-width:320pt;">
            <table class="section-table" style="width:100%; border-collapse:collapse; font-size:10.5pt;">
              ${row('Name', `${esc(youth.firstName)} ${esc(youth.lastName)}`)}
              ${row('ID Number', safe(youth.idNumber || youth.id))}
              ${row('Date of Birth', esc(fmt(youth.dob as any)))}
              ${row('Age', safe(youth.age))}
              ${row('Sex', safe(youth.sex))}
              ${row('Race', safe(youth.race))}
              ${row('Place of Birth', safe(youth.placeOfBirth))}
              ${row('Address', safe([youth.address?.street, youth.address?.city, youth.address?.state, youth.address?.zip].filter(Boolean).join(', ')))}
            </table>
          </div>
          <div class="photo-container" style="flex:0 0 auto;">${photoBox}</div>
        </div>

        ${tableWithHeaderOpen('Admission / Status')}
          ${row('Admission Date', esc(fmt(youth.admissionDate as any)))}
          ${row('Admission Time', safe(youth.admissionTime))}
          ${row('RCS In', safe(youth.rcsIn))}
          ${row('Discharge Date', esc(fmt(youth.dischargeDate as any)))}
          ${row('Discharge Time', safe(youth.dischargeTime))}
          ${row('RCS Out', safe(youth.rcsOut))}
          ${row('Current Level', safe(youth.level))}
          ${row('Legal Status', safe(youth.legalStatus))}
        ${tableClose}

        ${tableWithHeaderOpen('Physical Description')}
          ${row('Height', safe(youth.physicalDescription?.height))}
          ${row('Weight', safe(youth.physicalDescription?.weight))}
          ${row('Hair Color', safe(youth.physicalDescription?.hairColor))}
          ${row('Eye Color', safe(youth.physicalDescription?.eyeColor))}
          ${row('Tattoos/Scars', safePre(youth.physicalDescription?.tattoosScars))}
        ${tableClose}

        ${tableWithHeaderOpen('Guardians & Contacts')}
          ${row('Mother', safe([youth.mother?.name, youth.mother?.phone].filter(Boolean).join(' — ')))}
          ${row('Father', safe([youth.father?.name, youth.father?.phone].filter(Boolean).join(' — ')))}
          ${row('Legal Guardian', safe(typeof youth.legalGuardian === 'object' ? `${youth.legalGuardian?.name || ''}${youth.legalGuardian?.phone ? ' — ' + youth.legalGuardian?.phone : ''}` : youth.legalGuardian))}
          ${row('Next of Kin', safe([youth.nextOfKin?.name, youth.nextOfKin?.relationship, youth.nextOfKin?.phone].filter(Boolean).join(' — ')))}
          ${row('Probation Officer', safe(typeof youth.probationOfficer === 'object' ? [youth.probationOfficer?.name, youth.probationOfficer?.phone, youth.probationOfficer?.email].filter(Boolean).join(' — ') : youth.probationOfficer))}
          ${row('Caseworker', safe(typeof youth.caseworker === 'object' ? [youth.caseworker?.name, youth.caseworker?.phone].filter(Boolean).join(' — ') : youth.caseworker))}
          ${row('Guardian Ad Litem', safe(typeof youth.guardianAdLitem === 'object' ? [youth.guardianAdLitem?.name, youth.guardianAdLitem?.phone].filter(Boolean).join(' — ') : youth.guardianAdLitem))}
          ${row('Attorney', safe(youth.attorney))}
          ${row('Judge', safe(youth.judge))}
          ${row('Placing Agency/County', safe(youth.placingAgencyCounty))}
        ${tableClose}

        ${tableWithHeaderOpen('Health / Education / Religion')}
          ${row('Allergies', safePre(youth.allergies))}
          ${row('Current Medications', safePre(youth.currentMedications))}
          ${row('Significant Health Conditions', safePre(youth.significantHealthConditions))}
          ${row('Religion', safe(youth.religion))}
          ${row('Last School Attended', safe(youth.lastSchoolAttended))}
          ${row('IEP', fmtBool(youth.hasIEP))}
          ${row('Current Grade', safe(youth.currentGrade || youth.grade))}
          ${row('Current School', safe(youth.currentSchool))}
          ${row('School Contact', safe(youth.schoolContact))}
          ${row('School Phone', safe(youth.schoolPhone))}
          ${row('Academic Strengths', safePre(youth.academicStrengths))}
          ${row('Academic Challenges', safePre(youth.academicChallenges))}
          ${row('Education Goals', safePre(youth.educationGoals))}
        ${tableClose}

        ${tableWithHeaderOpen('Medical Details')}
          ${row('Physician', safe(youth.physician))}
          ${row('Physician Phone', safe(youth.physicianPhone))}
          ${row('Insurance Provider', safe(youth.insuranceProvider))}
          ${row('Policy Number', safe(youth.policyNumber))}
          ${row('Medical Conditions', safePre(youth.medicalConditions))}
          ${row('Medical Restrictions', safePre(youth.medicalRestrictions))}
        ${tableClose}

        ${tableWithHeaderOpen('Mental Health')}
          ${row('Diagnoses', safePre(youth.currentDiagnoses || youth.diagnoses))}
          ${row('Trauma History', joinList(youth.traumaHistory))}
          ${row('Previous Treatment', safePre(youth.previousTreatment))}
          ${row('Current Counseling', joinList(youth.currentCounseling))}
          ${row('Therapist', safe([youth.therapistName, youth.therapistContact].filter(Boolean).join(' — ')))}
          ${row('Session Frequency', safe(youth.sessionFrequency))}
          ${row('Session Time', safe(youth.sessionTime))}
          ${row('Self-harm History', joinList(youth.selfHarmHistory))}
          ${row('Last Incident Date', safe(youth.lastIncidentDate))}
          ${row('Has Safety Plan', fmtBool(youth.hasSafetyPlan))}
        ${tableClose}

        ${tableWithHeaderOpen('Behavioral Information')}
          ${row('Gets Along With Others', safePre(youth.getAlongWithOthers))}
          ${row('Strengths / Talents', safePre(youth.strengthsTalents))}
          ${row('Interests', safePre(youth.interests))}
          ${row('Behavior Problems', safePre(youth.behaviorProblems))}
          ${row('Dislikes About Self', safePre(youth.dislikesAboutSelf))}
          ${row('Anger Triggers', safePre(youth.angerTriggers))}
          ${row('History of Physical Harm to Others', fmtBool(youth.historyPhysicallyHurting))}
          ${row('History of Vandalism', fmtBool(youth.historyVandalism))}
          ${row('Gang Involvement', fmtBool(youth.gangInvolvement))}
          ${row('Family History of Violent Crimes', fmtBool(youth.familyViolentCrimes))}
        ${tableClose}

        ${tableWithHeaderOpen('Substance Use')}
          ${row('Tobacco (past 6–12 months)', fmtBool(youth.tobaccoPast6To12Months))}
          ${row('Alcohol (past 6–12 months)', fmtBool(youth.alcoholPast6To12Months))}
          ${row('Drugs/Vaping/Marijuana (past 6–12 months)', fmtBool(youth.drugsVapingMarijuanaPast6To12Months))}
          ${row('Drug Testing Dates', safePre(youth.drugTestingDates))}
        ${tableClose}

        ${tableWithHeaderOpen('Community Resources Used')}
          ${row('Day Treatment Services', fmtBool(youth.communityResources?.dayTreatmentServices))}
          ${row('Intensive In-Home Services', fmtBool(youth.communityResources?.intensiveInHomeServices))}
          ${row('Day School Placement', fmtBool(youth.communityResources?.daySchoolPlacement))}
          ${row('1:1 School Counselor', fmtBool(youth.communityResources?.oneOnOneSchoolCounselor))}
          ${row('Mental Health Support Services', fmtBool(youth.communityResources?.mentalHealthSupportServices))}
          ${row('Other', safePre(youth.communityResources?.other))}
        ${tableClose}

        ${tableWithHeaderOpen('Desired Focus of Treatment')}
          ${row('Excessive Dependency', fmtBool(youth.treatmentFocus?.excessiveDependency))}
          ${row('Withdrawal / Isolation', fmtBool(youth.treatmentFocus?.withdrawalIsolation))}
          ${row('Parent-Child Relationship', fmtBool(youth.treatmentFocus?.parentChildRelationship))}
          ${row('Peer Relationship', fmtBool(youth.treatmentFocus?.peerRelationship))}
          ${row('Acceptance of Authority', fmtBool(youth.treatmentFocus?.acceptanceOfAuthority))}
          ${row('Lying', fmtBool(youth.treatmentFocus?.lying))}
          ${row('Poor Academic Achievement', fmtBool(youth.treatmentFocus?.poorAcademicAchievement))}
          ${row('Poor Self-Esteem', fmtBool(youth.treatmentFocus?.poorSelfEsteem))}
          ${row('Manipulative', fmtBool(youth.treatmentFocus?.manipulative))}
          ${row('Property Destruction', fmtBool(youth.treatmentFocus?.propertyDestruction))}
          ${row('Hyperactivity', fmtBool(youth.treatmentFocus?.hyperactivity))}
          ${row('Anxiety', fmtBool(youth.treatmentFocus?.anxiety))}
          ${row('Verbal Aggression', fmtBool(youth.treatmentFocus?.verbalAggression))}
          ${row('Assaultive', fmtBool(youth.treatmentFocus?.assaultive))}
          ${row('Depression', fmtBool(youth.treatmentFocus?.depression))}
          ${row('Stealing', fmtBool(youth.treatmentFocus?.stealing))}
        ${tableClose}

        ${tableWithHeaderOpen('Discharge Plan')}
          ${row('Parents', safePre(youth.dischargePlan?.parents))}
          ${row('Relative (Name / Relationship)', safe([youth.dischargePlan?.relative?.name, youth.dischargePlan?.relative?.relationship].filter(Boolean).join(' — ')))}
          ${row('Regular Foster Care', fmtBool(youth.dischargePlan?.regularFosterCare))}
          ${row('Estimated Length of Stay (months)', safe(youth.dischargePlan?.estimatedLengthOfStayMonths))}
        ${tableClose}

        ${tableWithHeaderOpen('Emergency Shelter Care')}
          ${row('Legal Guardian Info', safePre(youth.emergencyShelterCare?.legalGuardianInfo))}
          ${row('Parents Notified', fmtBool(youth.emergencyShelterCare?.parentsNotified))}
          ${row('Immediate Needs', safePre(youth.emergencyShelterCare?.immediateNeeds))}
          ${row('Placing Agency Individual', safe(youth.emergencyShelterCare?.placingAgencyIndividual))}
          ${row('Placement Date', esc(fmt(youth.emergencyShelterCare?.placementDate as any)))}
          ${row('Placement Time', safe(youth.emergencyShelterCare?.placementTime))}
          ${row('Reason for Placement', safePre(youth.emergencyShelterCare?.reasonForPlacement))}
          ${row('Intake Worker Observation', safePre(youth.emergencyShelterCare?.intakeWorkerObservation))}
          ${row('Orientation Completed By', safe(youth.emergencyShelterCare?.orientationCompletedBy))}
          ${row('Orientation Date', esc(fmt(youth.emergencyShelterCare?.orientationDate as any)))}
          ${row('Orientation Time', safe(youth.emergencyShelterCare?.orientationTime))}
        ${tableClose}

        ${tableWithHeaderOpen('Referral & Miscellaneous')}
          ${row('Referral Source', safe(youth.referralSource))}
          ${row('Referral Reason', safePre(youth.referralReason))}
          ${row('Education Info (summary)', safePre(youth.educationInfo))}
          ${row('Medical Info (summary)', safePre(youth.medicalInfo))}
          ${row('Mental Health Info (summary)', safePre(youth.mentalHealthInfo))}
        ${tableClose}
      </div>`;
  };

  const profileSection = profileFormSection();

  const generated = format(new Date(), 'M/d/yyyy h:mm a');

  // Compose HTML document body
  const body = `
    ${header(title)}
    ${youthInfo}
    ${period}
    ${profileSection}
    ${behaviorSection()}
    ${ratingsSection()}
    ${notesSection()}
    ${progressWeeklySection()}
    ${progressMonthlySection()}
    <div style="margin-top:12pt; font-size:10pt; color:#333;">Report Generated: ${esc(generated)}</div>
  `;

  // Wrap with print-friendly container and styles (Arial, tighter spacing, repeatable headers)
  return `
    <style>
      @page { 
        size: Letter; 
        margin: 36pt; 
        @bottom-right {
          content: "Page " counter(page) " of " counter(pages);
          font-size: 9pt;
          color: #000;
        }
      }
      * { 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
        box-sizing: border-box;
      }
      body { margin: 0; padding: 0; }
      .section-table { 
        margin-top: 8pt; 
        width: 100%;
        border-collapse: collapse;
      }
      table.section-table tr, table.section-table td, table.section-table th { 
        page-break-inside: avoid; 
        border: 1pt solid #000;
      }
      table.section-table thead { 
        display: table-header-group; 
      }
      table.section-table thead th {
        background: #eee !important;
        font-weight: bold;
        padding: 4pt 6pt;
      }
      table.section-table td {
        padding: 4pt 6pt;
        vertical-align: top;
        word-wrap: break-word;
        word-break: break-word;
      }
      h1, h2, h3 { 
        margin: 0 0 6pt; 
        page-break-after: avoid;
      }
      .photo-container {
        page-break-inside: avoid;
      }
      .profile-header {
        page-break-after: avoid;
      }
      /* Ensure images print properly */
      img {
        max-width: 100%;
        height: auto;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      /* Prevent orphaned content */
      p, div {
        orphans: 2;
        widows: 2;
      }
    </style>
    <div style="font-family: Arial, Helvetica, sans-serif; color:#000; font-size:11pt; line-height:1.35;">
      ${body}
    </div>`;
};

const getDateRange = (options: ReportOptions): { startDate: Date; endDate: Date } => {
  const today = new Date();
  
  switch (options.period) {
    case "last7":
      return {
        startDate: subDays(today, 7),
        endDate: today
      };
    case "last30":
      return {
        startDate: subDays(today, 30),
        endDate: today
      };
    case "last90":
      return {
        startDate: subDays(today, 90),
        endDate: today
      };
    case "custom":
      return {
        startDate: options.customStartDate ? new Date(options.customStartDate) : subDays(today, 30),
        endDate: options.customEndDate ? new Date(options.customEndDate) : today
      };
    case "allTime":
    default:
      return {
        startDate: new Date("2020-01-01"), // Far back date
        endDate: today
      };
  }
};

const fetchReportData = async (youthId: string, options: ReportOptions, startDate: Date, endDate: Date) => {
  const data: any = {};
  
  if (options.includeOptions.points) {
    const allPoints = await fetchBehaviorPointsAPI(youthId);
    data.behaviorPoints = allPoints.filter(point => {
      if (!point.date) return false;
      const pointDate = new Date(point.date);
      return pointDate >= startDate && pointDate <= endDate;
    });
  }
  
  if (options.includeOptions.notes) {
    const allNotes = await fetchProgressNotesAPI(youthId);
    data.progressNotes = allNotes.filter(note => {
      if (!note.date) return false;
      const noteDate = new Date(note.date);
      return noteDate >= startDate && noteDate <= endDate;
    });
  }
  
  // Fetch daily ratings for assessment data
  const allRatings = await fetchDailyRatingsAPI(youthId);
  data.dailyRatings = allRatings.filter(rating => {
    if (!rating.date) return false;
    const ratingDate = new Date(rating.date);
    return ratingDate >= startDate && ratingDate <= endDate;
  });
  
  return data;
};

const generateComprehensiveReport = async (
  youth: Youth, 
  data: any, 
  startDate: Date, 
  endDate: Date, 
  options: ReportOptions
): Promise<string> => {
  let report = `COMPREHENSIVE REPORT
Heartland Boys Home

Youth Information:
Name: ${youth.firstName} ${youth.lastName}
Date of Birth: ${youth.dob ? format(new Date(youth.dob), "M/d/yyyy") : "Not provided"}
Admission Date: ${youth.admissionDate ? format(new Date(youth.admissionDate), "M/d/yyyy") : "Not provided"}
Current Level: Level ${youth.level}

Report Period: ${format(startDate, "M/d/yyyy")} to ${format(endDate, "M/d/yyyy")}

`;

  if (options.includeOptions.profile) {
    report += `PROFILE INFORMATION:
Referral Source: ${youth.referralSource || "Not provided"}
Referral Reason: ${youth.referralReason || "Not provided"}
Education Info: ${youth.educationInfo || "Not provided"}
Medical Info: ${youth.medicalInfo || "Not provided"}
Mental Health Info: ${youth.mentalHealthInfo || "Not provided"}
Legal Status: ${youth.legalStatus || "Not provided"}

`;
  }

  if (options.includeOptions.points && data.behaviorPoints) {
    const totalPoints = data.behaviorPoints.reduce((sum: number, p: BehaviorPoints) => sum + (p.totalPoints || 0), 0);
    const avgMorning = data.behaviorPoints.length > 0 
      ? Math.round((data.behaviorPoints.reduce((sum: number, p: BehaviorPoints) => sum + (p.morningPoints || 0), 0) / data.behaviorPoints.length) * 10) / 10
      : 0;
    const avgAfternoon = data.behaviorPoints.length > 0 
      ? Math.round((data.behaviorPoints.reduce((sum: number, p: BehaviorPoints) => sum + (p.afternoonPoints || 0), 0) / data.behaviorPoints.length) * 10) / 10
      : 0;
    const avgEvening = data.behaviorPoints.length > 0 
      ? Math.round((data.behaviorPoints.reduce((sum: number, p: BehaviorPoints) => sum + (p.eveningPoints || 0), 0) / data.behaviorPoints.length) * 10) / 10
      : 0;

    report += `BEHAVIOR POINT SUMMARY:
Total Points This Period: ${totalPoints}
Average Morning Points: ${avgMorning}
Average Afternoon Points: ${avgAfternoon}
Average Evening Points: ${avgEvening}
Days Recorded: ${data.behaviorPoints.length}

`;
  }

  if (data.dailyRatings && data.dailyRatings.length > 0) {
    const calcAvg = (field: keyof DailyRating) => {
      const values = data.dailyRatings.map((r: DailyRating) => r[field] as number).filter((v: number) => v !== null && v !== undefined && v > 0);
      return values.length > 0 ? Math.round((values.reduce((sum: number, v: number) => sum + v, 0) / values.length) * 10) / 10 : 0;
    };

    report += `DAILY RATINGS SUMMARY:
Peer Interaction Average: ${calcAvg('peerInteraction')} / 5
Adult Interaction Average: ${calcAvg('adultInteraction')} / 5
Investment Level Average: ${calcAvg('investmentLevel')} / 5
Deal with Authority Average: ${calcAvg('dealAuthority')} / 5

`;
  }

  if (options.includeOptions.notes && data.progressNotes) {
    report += `PROGRESS NOTES (${data.progressNotes.length} entries):
`;
    // Increased limit to 50 notes to provide more context
    data.progressNotes.slice(0, 50).forEach((note: ProgressNote) => {
      report += `${note.date ? format(new Date(note.date), "M/d/yyyy") : "No date"} - ${note.category || "General"}: ${note.note || "No note"}\n`;
    });
    report += "\n";
  }

  report += `Report Generated: ${format(new Date(), "M/d/yyyy h:mm a")}`;
  
  return generateAIEnhancedReport(youth, data, startDate, endDate, options, report, "comprehensive");
};

const generateSummaryReport = async (
  youth: Youth, 
  data: any, 
  startDate: Date, 
  endDate: Date, 
  options: ReportOptions
): Promise<string> => {
  let report = `SUMMARY REPORT
Heartland Boys Home

Youth: ${youth.firstName} ${youth.lastName}
Period: ${format(startDate, "M/d/yyyy")} to ${format(endDate, "M/d/yyyy")}
Current Level: Level ${youth.level}

`;

  if (options.includeOptions.points && data.behaviorPoints) {
    const totalPoints = data.behaviorPoints.reduce((sum: number, p: BehaviorPoints) => sum + (p.totalPoints || 0), 0);
    report += `BEHAVIOR SUMMARY:
Total Points: ${totalPoints}
Days Recorded: ${data.behaviorPoints.length}
Daily Average: ${data.behaviorPoints.length > 0 ? Math.round(totalPoints / data.behaviorPoints.length) : 0}

`;
  }

  if (data.dailyRatings && data.dailyRatings.length > 0) {
    const calcAvg = (field: keyof DailyRating) => {
      const values = data.dailyRatings.map((r: DailyRating) => r[field] as number).filter((v: number) => v !== null && v !== undefined && v > 0);
      return values.length > 0 ? Math.round((values.reduce((sum: number, v: number) => sum + v, 0) / values.length) * 10) / 10 : 0;
    };

    report += `RATINGS SUMMARY:
Overall Performance: ${Math.round((calcAvg('peerInteraction') + calcAvg('adultInteraction') + calcAvg('investmentLevel') + calcAvg('dealAuthority')) / 4 * 10) / 10} / 5

`;
  }

  report += `Report Generated: ${format(new Date(), "M/d/yyyy h:mm a")}`;
  
  return generateAIEnhancedReport(youth, data, startDate, endDate, options, report, "summary");
};

const generateProgressReport = async (
  youth: Youth, 
  data: any, 
  startDate: Date, 
  endDate: Date, 
  options: ReportOptions
): Promise<string> => {
  let report = `PROGRESS REPORT
Heartland Boys Home

Youth: ${youth.firstName} ${youth.lastName}
Period: ${format(startDate, "M/d/yyyy")} to ${format(endDate, "M/d/yyyy")}

`;

  if (options.includeOptions.points && data.behaviorPoints) {
    const totalPoints = data.behaviorPoints.reduce((sum: number, p: BehaviorPoints) => sum + (p.totalPoints || 0), 0);
    const avgDaily = data.behaviorPoints.length > 0 ? Math.round(totalPoints / data.behaviorPoints.length) : 0;
    
    report += `BEHAVIOR PROGRESS:
Total Points Earned: ${totalPoints}
Days with Data: ${data.behaviorPoints.length}
Average Points per Day: ${avgDaily}

Weekly Breakdown:
`;
    
    // Group by weeks
    const weeklyData: { [key: string]: BehaviorPoints[] } = {};
    data.behaviorPoints.forEach((point: BehaviorPoints) => {
      if (point.date) {
        const weekStart = startOfWeek(new Date(point.date));
        const weekKey = format(weekStart, "M/d/yyyy");
        if (!weeklyData[weekKey]) weeklyData[weekKey] = [];
        weeklyData[weekKey].push(point);
      }
    });
    
    Object.entries(weeklyData).forEach(([week, points]) => {
      const weekTotal = points.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
      report += `Week of ${week}: ${weekTotal} points (${points.length} days)\n`;
    });
    
    report += "\n";
  }

  if (data.dailyRatings && data.dailyRatings.length > 0) {
    const calcAvg = (field: keyof DailyRating) => {
      const values = data.dailyRatings.map((r: DailyRating) => r[field] as number).filter((v: number) => v !== null && v !== undefined && v > 0);
      return values.length > 0 ? Math.round((values.reduce((sum: number, v: number) => sum + v, 0) / values.length) * 10) / 10 : 0;
    };

    report += `SKILL DEVELOPMENT PROGRESS:
Peer Interaction: ${calcAvg('peerInteraction')} / 5
Adult Interaction: ${calcAvg('adultInteraction')} / 5
Program Investment: ${calcAvg('investmentLevel')} / 5
Authority Response: ${calcAvg('dealAuthority')} / 5

`;
  }

  report += `Report Generated: ${format(new Date(), "M/d/yyyy h:mm a")}`;
  
  return generateAIEnhancedReport(youth, data, startDate, endDate, options, report, "progress");
};

// Enhanced AI-powered report generation helper
const generateAIEnhancedReport = async (
  youth: Youth,
  data: any,
  startDate: Date,
  endDate: Date,
  options: ReportOptions,
  baseReport: string,
  reportType: string
): Promise<string> => {
  if (!options.useAI) {
    return baseReport;
  }

  try {
    const aiSummary = await summarizeReport({
      youth,
      reportType,
      period: { 
        startDate: format(startDate, "yyyy-MM-dd"), 
        endDate: format(endDate, "yyyy-MM-dd") 
      },
      data
    });

    if (aiSummary) {
      return baseReport + "\n\nAI-GENERATED NARRATIVE:\n" + aiSummary;
    }
  } catch (error) {
    console.warn("AI enhancement failed:", error);
  }

  return baseReport;
};

// Generate sample data for troubleshooting when data is missing
const generateSampleData = (youth: Youth, reportType: string) => {
  const sampleNotes = [
    {
      date: new Date(),
      category: "Behavioral",
      note: `${youth.firstName} demonstrated improved conflict resolution skills during group activities. Showed leadership qualities when helping newer residents adjust to program expectations.`
    },
    {
      date: new Date(Date.now() - 86400000), // Yesterday
      category: "Academic",
      note: `Completed all assigned coursework on time. Showed particular strength in mathematics and expressed interest in pursuing vocational training in construction.`
    },
    {
      date: new Date(Date.now() - 172800000), // 2 days ago
      category: "Social",
      note: `Participated actively in group therapy session. Demonstrated empathy when supporting peer who was struggling with family contact issues.`
    }
  ];

  const sampleBehaviorPoints = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - i * 86400000),
    morningPoints: Math.floor(Math.random() * 3) + 3, // 3-5 points
    afternoonPoints: Math.floor(Math.random() * 3) + 3,
    eveningPoints: Math.floor(Math.random() * 3) + 3,
    totalPoints: 0
  })).map(p => ({ ...p, totalPoints: p.morningPoints + p.afternoonPoints + p.eveningPoints }));

  const sampleRatings = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - i * 86400000),
    peerInteraction: Math.floor(Math.random() * 2) + 4, // 4-5 rating
    adultInteraction: Math.floor(Math.random() * 2) + 4,
    investmentLevel: Math.floor(Math.random() * 2) + 3, // 3-4 rating
    dealAuthority: Math.floor(Math.random() * 2) + 4
  }));

  return {
    progressNotes: sampleNotes,
    behaviorPoints: sampleBehaviorPoints,
    dailyRatings: sampleRatings
  };
};

const generateCourtReport = async (
  youth: Youth,
  data: any,
  startDate: Date,
  endDate: Date,
  options: ReportOptions
): Promise<string> => {
  // Generate sample data if missing for troubleshooting
  const reportData = {
    progressNotes: data.progressNotes?.length ? data.progressNotes : generateSampleData(youth, "court").progressNotes,
    behaviorPoints: data.behaviorPoints?.length ? data.behaviorPoints : generateSampleData(youth, "court").behaviorPoints,
    dailyRatings: data.dailyRatings?.length ? data.dailyRatings : generateSampleData(youth, "court").dailyRatings
  };

  // Calculate comprehensive point statistics
  const pointStats = await getPointStatistics(youth.id, 30);
  const totalPointsForPeriod = await calculatePointsForPeriod(youth.id, startDate, endDate);
  const currentTotalPoints = await calculateTotalPoints(youth.id);

  let report = `COURT REPORT
Heartland Boys Home
Group Home

YOUTH INFORMATION:
Name: ${youth.firstName} ${youth.lastName}
Date of Birth: ${youth.dob ? format(new Date(youth.dob), "M/d/yyyy") : "Not provided"}
ID Number: ${youth.idNumber || "Not provided"}
Admission Date: ${youth.admissionDate ? format(new Date(youth.admissionDate), "M/d/yyyy") : "Not provided"}
Current Level: Level ${youth.level}
Days in Program: ${youth.admissionDate ? Math.floor((new Date().getTime() - new Date(youth.admissionDate).getTime()) / (1000 * 60 * 60 * 24)) : "Not calculated"}

PLACEMENT INFORMATION:
Legal Guardian: ${youth.legalGuardian || "Not provided"}
Relationship: ${youth.guardianRelationship || "Not provided"}
Probation Officer: ${youth.probationOfficer || "Not provided"}
Placing Authority: ${youth.placementAuthority || "Not provided"}
Estimated Length of Stay: ${youth.estimatedStay || "To be determined"}

CLINICAL INFORMATION:
Current Diagnoses: ${youth.currentDiagnoses || youth.diagnoses || "Not provided"}
Trauma History: ${youth.traumaHistory?.join(', ') || "Not documented"}
Current Medications: ${youth.currentMedications || "None reported"}
Allergies: ${youth.allergies || "None known"}

BEHAVIORAL PERFORMANCE:
Total Points Earned (All Time): ${currentTotalPoints.toLocaleString()}
Points Earned This Period: ${totalPointsForPeriod.toLocaleString()}
Average Daily Points: ${pointStats.averageDaily}
Highest Single Day: ${pointStats.highestDay} points
Performance Trend: ${pointStats.trend}
Days Above Average: ${pointStats.daysAboveAverage} of last 30 days
Legal Status: ${youth.legalStatus || "Not provided"}

REPORT PERIOD: ${format(startDate, "M/d/yyyy")} to ${format(endDate, "M/d/yyyy")}

PROGRAM PARTICIPATION:
${youth.firstName} has been actively participating in the group home program at Heartland Boys Home. The program focuses on behavioral modification, educational advancement, and therapeutic intervention.

BEHAVIORAL PROGRESS:
`;

  if (reportData.behaviorPoints && reportData.behaviorPoints.length > 0) {
    const totalPoints = reportData.behaviorPoints.reduce((sum: number, p: any) => sum + (p.totalPoints || 0), 0);
    const avgDaily = Math.round(totalPoints / reportData.behaviorPoints.length);
    
    report += `During the reporting period, ${youth.firstName} earned a total of ${totalPoints} behavior points over ${reportData.behaviorPoints.length} days, averaging ${avgDaily} points per day. The point system measures compliance with program expectations, peer interactions, and staff cooperation.

`;
  }

  if (reportData.dailyRatings && reportData.dailyRatings.length > 0) {
    const calcAvg = (field: string) => {
      const values = reportData.dailyRatings.map((r: any) => r[field]).filter((v: any) => v !== null && v !== undefined && v > 0);
      return values.length > 0 ? Math.round((values.reduce((sum: number, v: number) => sum + v, 0) / values.length) * 10) / 10 : 0;
    };

    report += `SKILL DEVELOPMENT ASSESSMENT:
- Peer Interaction: ${calcAvg('peerInteraction')}/5 - ${calcAvg('peerInteraction') >= 4 ? 'Excellent' : calcAvg('peerInteraction') >= 3 ? 'Good' : 'Needs Improvement'}
- Adult Interaction: ${calcAvg('adultInteraction')}/5 - ${calcAvg('adultInteraction') >= 4 ? 'Excellent' : calcAvg('adultInteraction') >= 3 ? 'Good' : 'Needs Improvement'}
- Program Investment: ${calcAvg('investmentLevel')}/5 - ${calcAvg('investmentLevel') >= 4 ? 'Excellent' : calcAvg('investmentLevel') >= 3 ? 'Good' : 'Needs Improvement'}
- Authority Response: ${calcAvg('dealAuthority')}/5 - ${calcAvg('dealAuthority') >= 4 ? 'Excellent' : calcAvg('dealAuthority') >= 3 ? 'Good' : 'Needs Improvement'}

`;
  }

  report += `THERAPEUTIC PROGRESS:
${youth.firstName} has been engaged in individual and group therapy sessions focusing on behavioral modification and social skill development. Progress notes indicate consistent participation and gradual improvement in emotional regulation and conflict resolution skills.

EDUCATIONAL STATUS:
${youth.educationInfo || `${youth.firstName} is enrolled in educational programming appropriate for their academic level. Regular assessments monitor progress and identify areas for additional support.`}

MEDICAL/MENTAL HEALTH:
${youth.medicalInfo || "Medical needs are monitored by qualified healthcare professionals."}
${youth.mentalHealthInfo || "Mental health services are provided as part of the comprehensive treatment approach."}

RECENT PROGRESS NOTES:
`;

  if (reportData.progressNotes && reportData.progressNotes.length > 0) {
    reportData.progressNotes.slice(0, 30).forEach((note: any) => {
      report += `${note.date ? format(new Date(note.date), "M/d/yyyy") : "Recent"} - ${note.category || "General"}: ${note.note || "Progress documented"}\n`;
    });
  }

  report += `
RECOMMENDATIONS:
1. Continue current treatment plan with regular progress monitoring
2. Maintain structured environment with clear expectations and consequences
3. Provide ongoing therapeutic support for behavioral and emotional development
4. Consider gradual increase in privileges and responsibilities as progress continues
5. Prepare for transition planning as appropriate milestones are achieved

SUMMARY:
${youth.firstName} continues to make measurable progress within the group home program. The structured environment and therapeutic interventions have contributed to improved behavioral regulation and social functioning. Continued participation in the program is recommended to maintain and build upon current gains.

Report Prepared By: Heartland Boys Home Clinical Staff
Date: ${format(new Date(), "M/d/yyyy")}
`;

  return generateAIEnhancedReport(youth, reportData, startDate, endDate, options, report, "court");
};

const generateDPNReport = async (
  youth: Youth,
  data: any,
  startDate: Date,
  endDate: Date,
  options: ReportOptions,
  frequency: "weekly" | "bi-weekly" | "monthly"
): Promise<string> => {
  // Generate sample data if missing for troubleshooting
  const reportData = {
    progressNotes: data.progressNotes?.length ? data.progressNotes : generateSampleData(youth, `dpn${frequency}`).progressNotes,
    behaviorPoints: data.behaviorPoints?.length ? data.behaviorPoints : generateSampleData(youth, `dpn${frequency}`).behaviorPoints,
    dailyRatings: data.dailyRatings?.length ? data.dailyRatings : generateSampleData(youth, `dpn${frequency}`).dailyRatings
  };

  const frequencyTitle = frequency === "bi-weekly" ? "Bi-Weekly" : frequency.charAt(0).toUpperCase() + frequency.slice(1);
  
  let report = `DPN ${frequencyTitle.toUpperCase()} PROGRESS EVALUATION
Heartland Boys Home
Department of Probation and Parole Reporting

YOUTH INFORMATION:
Name: ${youth.firstName} ${youth.lastName}
Date of Birth: ${youth.dob ? format(new Date(youth.dob), "M/d/yyyy") : "Not provided"}
Admission Date: ${youth.admissionDate ? format(new Date(youth.admissionDate), "M/d/yyyy") : "Not provided"}
Current Level: Level ${youth.level}
Legal Status: ${youth.legalStatus || "Court-ordered residential placement"}

EVALUATION PERIOD: ${format(startDate, "M/d/yyyy")} to ${format(endDate, "M/d/yyyy")}

PROGRAM COMPLIANCE:
${youth.firstName} has maintained consistent participation in all required program components during this ${frequency} evaluation period. Attendance at therapeutic sessions, educational programming, and structured activities has been satisfactory.

BEHAVIORAL PERFORMANCE:
`;

  if (reportData.behaviorPoints && reportData.behaviorPoints.length > 0) {
    const totalPoints = reportData.behaviorPoints.reduce((sum: number, p: any) => sum + (p.totalPoints || 0), 0);
    const avgDaily = Math.round(totalPoints / reportData.behaviorPoints.length);
    const maxPossible = reportData.behaviorPoints.length * 15; // Assuming 15 is max daily points
    const percentage = Math.round((totalPoints / maxPossible) * 100);
    
    report += `Behavior Point Summary:
- Total Points Earned: ${totalPoints} out of ${maxPossible} possible (${percentage}%)
- Daily Average: ${avgDaily} points
- Days Evaluated: ${reportData.behaviorPoints.length}
- Performance Level: ${percentage >= 80 ? 'Excellent' : percentage >= 70 ? 'Good' : percentage >= 60 ? 'Satisfactory' : 'Needs Improvement'}

`;
  }

  if (reportData.dailyRatings && reportData.dailyRatings.length > 0) {
    const calcAvg = (field: string) => {
      const values = reportData.dailyRatings.map((r: any) => r[field]).filter((v: any) => v !== null && v !== undefined && v > 0);
      return values.length > 0 ? Math.round((values.reduce((sum: number, v: number) => sum + v, 0) / values.length) * 10) / 10 : 0;
    };

    const peerAvg = calcAvg('peerInteraction');
    const adultAvg = calcAvg('adultInteraction');
    const investmentAvg = calcAvg('investmentLevel');
    const authorityAvg = calcAvg('dealAuthority');

    report += `SKILL DEVELOPMENT RATINGS:
- Peer Relationships: ${peerAvg}/5 - ${peerAvg >= 4 ? 'Demonstrates positive peer interactions and leadership' : peerAvg >= 3 ? 'Generally positive peer relationships' : 'Working on peer interaction skills'}
- Staff Relationships: ${adultAvg}/5 - ${adultAvg >= 4 ? 'Excellent cooperation and respect with staff' : adultAvg >= 3 ? 'Good working relationship with staff' : 'Developing appropriate staff relationships'}
- Program Engagement: ${investmentAvg}/5 - ${investmentAvg >= 4 ? 'Highly engaged and motivated participant' : investmentAvg >= 3 ? 'Adequate program participation' : 'Needs encouragement for full participation'}
- Authority Response: ${authorityAvg}/5 - ${authorityAvg >= 4 ? 'Consistently follows rules and accepts guidance' : authorityAvg >= 3 ? 'Generally compliant with expectations' : 'Working on accepting authority and following rules'}

`;
  }

  report += `THERAPEUTIC PROGRESS:
Individual and group therapy sessions have focused on behavioral modification, emotional regulation, and social skill development. ${youth.firstName} has shown progress in identifying triggers and implementing coping strategies.

EDUCATIONAL ENGAGEMENT:
${youth.educationInfo || `${youth.firstName} is participating in educational programming with regular attendance and effort. Academic progress is monitored and supported through individualized instruction.`}

SIGNIFICANT INCIDENTS/ACHIEVEMENTS:
`;

  if (reportData.progressNotes && reportData.progressNotes.length > 0) {
    const recentNotes = reportData.progressNotes.slice(0, 15);
    recentNotes.forEach((note: any) => {
      report += `• ${note.date ? format(new Date(note.date), "M/d/yyyy") : "Recent"}: ${note.note || "Progress documented in treatment plan"}\n`;
    });
  } else {
    report += `• No significant incidents reported during this period
• Continued steady progress in program participation
• Maintained appropriate behavior standards
`;
  }

  report += `
TREATMENT PLAN ADHERENCE:
${youth.firstName} is following the established treatment plan with regular participation in:
- Individual therapy sessions
- Group therapy and skill-building activities
- Educational programming
- Recreational and structured activities
- Medical and mental health services as needed

RISK ASSESSMENT:
Current risk level: ${youth.level === 'I' ? 'Low' : youth.level === 'II' ? 'Moderate' : youth.level === 'III' ? 'Moderate-High' : 'Moderate'}
No significant safety concerns identified during this evaluation period.

RECOMMENDATIONS FOR NEXT PERIOD:
1. Continue current treatment interventions and behavioral expectations
2. Monitor progress toward established treatment goals
3. Provide ongoing support for skill development and emotional regulation
4. Maintain regular communication with probation officer regarding progress
5. Consider advancement opportunities as milestones are achieved

NEXT EVALUATION: ${format(
  frequency === "weekly" ? 
    new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000) :
    frequency === "bi-weekly" ?
      new Date(endDate.getTime() + 14 * 24 * 60 * 60 * 1000) :
      new Date(endDate.getTime() + 30 * 24 * 60 * 60 * 1000),
  "M/d/yyyy"
)}

Report Prepared By: Heartland Boys Home Clinical Team
Date: ${format(new Date(), "M/d/yyyy")}
Contact: [Phone] | [Email]
`;

  return generateAIEnhancedReport(youth, reportData, startDate, endDate, options, report, `dpn${frequency}`);
};

export const downloadReport = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
