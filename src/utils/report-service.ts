import { Youth, BehaviorPoints, DailyRating, ProgressNote } from "@/types/app-types";
import { fetchBehaviorPoints, fetchDailyRatings, fetchProgressNotes } from "./local-storage-utils";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, subDays } from "date-fns";

export interface ReportOptions {
  reportType: "comprehensive" | "summary" | "progress";
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
      return generateProgressReport(youth, data, startDate, endDate, options);
    default:
      throw new Error("Invalid report type");
  }
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
    const allPoints = fetchBehaviorPoints(youthId);
    data.behaviorPoints = allPoints.filter(point => {
      if (!point.date) return false;
      const pointDate = new Date(point.date);
      return pointDate >= startDate && pointDate <= endDate;
    });
  }
  
  if (options.includeOptions.notes) {
    const allNotes = fetchProgressNotes(youthId);
    data.progressNotes = allNotes.filter(note => {
      if (!note.date) return false;
      const noteDate = new Date(note.date);
      return noteDate >= startDate && noteDate <= endDate;
    });
  }
  
  // Fetch daily ratings for assessment data
  const allRatings = fetchDailyRatings(youthId);
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