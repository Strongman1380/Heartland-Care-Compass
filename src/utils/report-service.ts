import { Youth, BehaviorPoints, DailyRating, ProgressNote } from "@/types/app-types";
import { fetchBehaviorPoints, fetchDailyRatings, fetchProgressNotes } from "./local-storage-utils";
import { getBehaviorPointsByYouth, getDailyRatingsByYouth, getProgressNotesByYouth } from "@/lib/api";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, subDays } from "date-fns";

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
  reportType: "comprehensive" | "summary" | "progress" | "progressMonthly" | "court";
  period: "allTime" | "last7" | "last30" | "last90" | "custom";
  customStartDate?: string;
  customEndDate?: string;
  includeOptions: {
    profile: boolean;
    points: boolean;
    notes: boolean;
    assessment: boolean;
    successPlan: boolean;
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
      <img src="${logoSrc}" alt="Heartland Boys Home" style="height:56px; object-fit:contain; margin-bottom:6pt;"/>
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
    const items = (data.progressNotes as ProgressNote[]).slice(0, 10).map(n => `
      <li>${fmt(n.date as any)} - ${esc(n.category || 'General')}: ${esc(n.note || 'No note')}</li>`).join('');
    return `
      <div style="margin:12pt 0;">
        <h3 style="font-size:12pt; margin:0 0 6pt;">Progress Notes (${(data.progressNotes as any[]).length} entries)</h3>
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
  }

  const profileSection = options.includeOptions.profile ? `
    <div style="margin:12pt 0;">
      <h3 style="font-size:12pt; margin:0 0 6pt;">Profile Information</h3>
      <div style="font-size:11pt;">
        <div><strong>Referral Source:</strong> ${esc(youth.referralSource || 'Not provided')}</div>
        <div><strong>Referral Reason:</strong> ${esc(youth.referralReason || 'Not provided')}</div>
        <div><strong>Education Info:</strong> ${esc(youth.educationInfo || 'Not provided')}</div>
        <div><strong>Medical Info:</strong> ${esc(youth.medicalInfo || 'Not provided')}</div>
        <div><strong>Mental Health Info:</strong> ${esc(youth.mentalHealthInfo || 'Not provided')}</div>
        <div><strong>Legal Status:</strong> ${esc(youth.legalStatus || 'Not provided')}</div>
      </div>
    </div>` : '';

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

  // Wrap with minimal print-friendly container
  return `
    <div style="font-family: 'Times New Roman', serif; color:#000; font-size:12pt; line-height:1.4;">
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

const generateComprehensiveReport = (
  youth: Youth, 
  data: any, 
  startDate: Date, 
  endDate: Date, 
  options: ReportOptions
): string => {
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
    data.progressNotes.slice(0, 10).forEach((note: ProgressNote) => {
      report += `${note.date ? format(new Date(note.date), "M/d/yyyy") : "No date"} - ${note.category || "General"}: ${note.note || "No note"}\n`;
    });
    report += "\n";
  }

  report += `Report Generated: ${format(new Date(), "M/d/yyyy h:mm a")}`;
  
  return report;
};

const generateSummaryReport = (
  youth: Youth, 
  data: any, 
  startDate: Date, 
  endDate: Date, 
  options: ReportOptions
): string => {
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
  
  return report;
};

const generateProgressReport = (
  youth: Youth, 
  data: any, 
  startDate: Date, 
  endDate: Date, 
  options: ReportOptions
): string => {
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
  
  return report;
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
