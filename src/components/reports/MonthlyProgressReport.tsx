import { useState, useEffect, useRef } from "react";
import { Youth } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormattedText } from "@/components/ui/formatted-text";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, FileText, Save, FileDown, RotateCcw } from "lucide-react";
import { format, differenceInDays, differenceInWeeks, differenceInMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { exportElementToPDF } from "@/utils/export";
import { fetchBehaviorPoints, fetchDailyRatings, fetchProgressNotes } from "@/utils/local-storage-utils";
import { getBehaviorPointsByYouth, getDailyRatingsByYouth, getProgressNotesByYouth } from "@/lib/api";
import { calculateTotalPoints, calculatePointsForPeriod } from "@/utils/pointCalculations";

// API fetch functions with fallback to localStorage
const fetchBehaviorPointsAPI = async (youthId: string) => {
  try {
    return await getBehaviorPointsByYouth(youthId);
  } catch (e) {
    console.warn('API fetch failed for behavior-points; falling back to localStorage:', e);
    return fetchBehaviorPoints(youthId);
  }
};

const fetchProgressNotesAPI = async (youthId: string) => {
  try {
    return await getProgressNotesByYouth(youthId);
  } catch (e) {
    console.warn('API fetch failed for progress-notes; falling back to localStorage:', e);
    return fetchProgressNotes(youthId);
  }
};

const fetchDailyRatingsAPI = async (youthId: string) => {
  try {
    return await getDailyRatingsByYouth(youthId);
  } catch (e) {
    console.warn('API fetch failed for daily-ratings; falling back to localStorage:', e);
    return fetchDailyRatings(youthId);
  }
};

interface MonthlyProgressReportProps {
  youth: Youth;
}

interface MonthlyReportData {
  // Youth Profile Information
  fullLegalName: string;
  preferredName: string;
  dateOfBirth: string;
  age: string;
  dateOfAdmission: string;
  lengthOfStay: string;
  currentLevel: string;
  currentPlacement: string;
  probationOfficer: string;
  guardiansInfo: string;
  schoolPlacement: string;
  currentDiagnoses: string;

  // Program Participation & Daily Points
  highPointAreas: string;
  lowPointAreas: string;
  trendsOverTime: string;
  incentivesEarned: string;

  // Behavioral Summary
  behavioralSummary: string;

  // Academic Progress
  academicProgress: string;
  schoolPerformance: string;
  educationalGoals: string;

  // Social/Emotional Development
  socialProgress: string;
  emotionalRegulation: string;
  peerRelationships: string;

  // Treatment Progress
  treatmentGoals: string;
  treatmentProgress: string;
  therapyParticipation: string;

  // Risk Assessment
  riskLevel: string;
  riskFactors: string;

  // Real Colors Profile
  primaryColor: string;
  secondaryColor: string;
  colorProfile: string;

  // Placement Recommendation
  placementRecommendation: string;
  recommendationReason: string;
  futureGoals: string;

  // Report metadata
  preparedBy: string;
  reportDate: string;
  month: string;
  year: string;
}

export const MonthlyProgressReport = ({ youth }: MonthlyProgressReportProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [reportData, setReportData] = useState<MonthlyReportData>({
    fullLegalName: "",
    preferredName: "",
    dateOfBirth: "",
    age: "",
    dateOfAdmission: "",
    lengthOfStay: "",
    currentLevel: "",
    currentPlacement: "",
    probationOfficer: "",
    guardiansInfo: "",
    schoolPlacement: "",
    currentDiagnoses: "",
    highPointAreas: "",
    lowPointAreas: "",
    trendsOverTime: "",
    incentivesEarned: "",
    behavioralSummary: "",
    academicProgress: "",
    schoolPerformance: "",
    educationalGoals: "",
    socialProgress: "",
    emotionalRegulation: "",
    peerRelationships: "",
    treatmentGoals: "",
    treatmentProgress: "",
    therapyParticipation: "",
    riskLevel: "",
    riskFactors: "",
    primaryColor: "",
    secondaryColor: "",
    colorProfile: "",
    placementRecommendation: "",
    recommendationReason: "",
    futureGoals: "",
    preparedBy: "",
    reportDate: format(new Date(), "yyyy-MM-dd"),
    month: format(new Date(), "MMMM"),
    year: format(new Date(), "yyyy")
  });

  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // Auto-populate form with youth data
  const autoPopulateForm = async () => {
    if (!youth?.id) {
      console.log('No youth ID provided');
      return;
    }

    console.log('Auto-populating form for youth:', youth.firstName, youth.lastName, 'ID:', youth.id);

    try {
      // Calculate date range for the selected month
      const monthStart = new Date(selectedMonth + "-01");
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

      console.log('Selected month range:', format(monthStart, 'yyyy-MM-dd'), 'to', format(monthEnd, 'yyyy-MM-dd'));

      // Fetch data for the selected month
      const [behaviorPoints, progressNotes, dailyRatings] = await Promise.all([
        fetchBehaviorPointsAPI(youth.id).catch(() => fetchBehaviorPoints(youth.id)),
        fetchProgressNotesAPI(youth.id).catch(() => fetchProgressNotes(youth.id)),
        fetchDailyRatingsAPI(youth.id).catch(() => fetchDailyRatings(youth.id))
      ]);

      console.log('Fetched data:', {
        behaviorPoints: behaviorPoints.length,
        progressNotes: progressNotes.length,
        dailyRatings: dailyRatings.length
      });

      // Filter data for the selected month
      const monthBehaviorPoints = behaviorPoints.filter(point => {
        if (!point.date) return false;
        const pointDate = new Date(point.date);
        return pointDate >= monthStart && pointDate <= monthEnd;
      });

      const monthProgressNotes = progressNotes.filter(note => {
        if (!note.date) return false;
        const noteDate = new Date(note.date);
        return noteDate >= monthStart && noteDate <= monthEnd;
      });

      const monthDailyRatings = dailyRatings.filter(rating => {
        if (!rating.date) return false;
        const ratingDate = new Date(rating.date);
        return ratingDate >= monthStart && ratingDate <= monthEnd;
      });

      // Calculate statistics
      const totalPoints = monthBehaviorPoints.reduce((sum, point) => sum + (point.totalPoints || 0), 0);
      const avgPoints = monthBehaviorPoints.length > 0 ? Math.round(totalPoints / monthBehaviorPoints.length) : 0;

      const avgPeerInteraction = monthDailyRatings.length > 0
        ? Math.round((monthDailyRatings.reduce((sum, r) => sum + (r.peerInteraction || 0), 0) / monthDailyRatings.length) * 10) / 10
        : 0;
      const avgAdultInteraction = monthDailyRatings.length > 0
        ? Math.round((monthDailyRatings.reduce((sum, r) => sum + (r.adultInteraction || 0), 0) / monthDailyRatings.length) * 10) / 10
        : 0;
      const avgInvestmentLevel = monthDailyRatings.length > 0
        ? Math.round((monthDailyRatings.reduce((sum, r) => sum + (r.investmentLevel || 0), 0) / monthDailyRatings.length) * 10) / 10
        : 0;
      const avgAuthorityRating = monthDailyRatings.length > 0
        ? Math.round((monthDailyRatings.reduce((sum, r) => sum + (r.dealAuthority || 0), 0) / monthDailyRatings.length) * 10) / 10
        : 0;

      // Calculate length of stay
      let lengthOfStay = "";
      if (youth.admissionDate) {
        const admissionDate = new Date(youth.admissionDate);
        const months = differenceInMonths(new Date(), admissionDate);
        if (months >= 12) {
          const years = Math.floor(months / 12);
          const remainingMonths = months % 12;
          lengthOfStay = `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
        } else {
          lengthOfStay = `${months} month${months > 1 ? 's' : ''}`;
        }
      }

      // Calculate age
      let age = "";
      if (youth.dob) {
        const dob = new Date(youth.dob as any);
        const today = new Date();
        age = Math.floor(differenceInDays(today, dob) / 365.25).toString();
      }

      // Map youth data to form fields
      const autoPopulatedData = {
        // Youth Profile Information
        fullLegalName: `${youth.firstName} ${youth.lastName}`,
        preferredName: youth.firstName,
        dateOfBirth: youth.dob ? format(new Date(youth.dob as any), "yyyy-MM-dd") : "",
        age,
        dateOfAdmission: youth.admissionDate ? format(new Date(youth.admissionDate as any), "yyyy-MM-dd") : "",
        lengthOfStay,
        currentLevel: typeof youth.level === 'number' ? `Level ${youth.level}` : `Level ${youth.level}`,
        currentPlacement: "Heartland Boys Home",
        probationOfficer: typeof youth.probationOfficer === 'object'
          ? youth.probationOfficer?.name || ""
          : youth.probationOfficer || "",
        guardiansInfo: formatGuardiansInfo(youth),
        schoolPlacement: youth.currentSchool || youth.lastSchoolAttended || "",
        currentDiagnoses: youth.currentDiagnoses || youth.diagnoses || "",

        // Program Participation & Daily Points
        incentivesEarned: `${totalPoints} total points, ${avgPoints} avg/day over ${monthBehaviorPoints.length} days`,
        highPointAreas: generateHighPointAreas(avgPeerInteraction, avgAdultInteraction, avgInvestmentLevel, avgAuthorityRating),
        lowPointAreas: generateLowPointAreas(avgPeerInteraction, avgAdultInteraction, avgInvestmentLevel, avgAuthorityRating),
        trendsOverTime: generateTrendsAnalysis(monthBehaviorPoints, monthDailyRatings),

        // Academic Progress
        academicProgress: generateAcademicProgress(youth),
        schoolPerformance: generateSchoolPerformance(youth),
        educationalGoals: youth.educationGoals || "",

        // Behavioral Summary
        behavioralSummary: generateBehavioralSummary(monthBehaviorPoints, monthProgressNotes),

        // Social/Emotional Development
        socialProgress: generateSocialProgress(avgPeerInteraction, avgAdultInteraction),
        emotionalRegulation: generateEmotionalRegulation(avgAuthorityRating),
        peerRelationships: generatePeerRelationships(avgPeerInteraction),

        // Treatment Progress
        treatmentGoals: generateTreatmentGoals(youth),
        treatmentProgress: generateTreatmentProgress(monthProgressNotes),
        therapyParticipation: generateTherapyParticipation(youth),

        // Risk Assessment
        riskLevel: (typeof youth.level === 'number' && youth.level <= 2) ||
                   (typeof youth.level === 'string' && (youth.level === "I" || youth.level === "II")) ? "Low" : "Moderate",
        riskFactors: generateRiskFactors(youth),

        // Real Colors Profile (needs assessment data)
        primaryColor: "",
        secondaryColor: "",
        colorProfile: "",

        // Placement Recommendation
        placementRecommendation: generatePlacementRecommendation(youth),
        recommendationReason: generateRecommendationReason(youth),
        futureGoals: generateFutureGoals(youth)
      };

      // Only update fields that are currently empty to preserve user edits
      setReportData(prev => {
        const updates: Partial<typeof reportData> = {};

        // Update each field only if it's currently empty
        Object.entries(autoPopulatedData).forEach(([key, value]) => {
          if (!prev[key as keyof typeof reportData] && value) {
            updates[key as keyof typeof reportData] = value as any;
          }
        });

        return { ...prev, ...updates };
      });

    } catch (error) {
      console.error("Error auto-populating form:", error);
    }
  };

  // Helper functions for generating content
  const formatGuardiansInfo = (youth: Youth): string => {
    const guardians = [];
    if (youth.legalGuardian) {
      if (typeof youth.legalGuardian === 'object') {
        guardians.push(`${youth.legalGuardian.name || 'Legal Guardian'} (Relationship: ${youth.guardianRelationship || 'Unknown'})`);
      } else {
        guardians.push(`${youth.legalGuardian} (Legal Guardian)`);
      }
    }
    if (youth.mother?.name) guardians.push(`${youth.mother.name} (Mother)`);
    if (youth.father?.name) guardians.push(`${youth.father.name} (Father)`);
    if (youth.nextOfKin?.name) guardians.push(`${youth.nextOfKin.name} (Next of Kin: ${youth.nextOfKin.relationship || 'Unknown'})`);

    return guardians.length > 0 ? guardians.join('; ') : "No guardian information available";
  };

  const generateHighPointAreas = (peer: number, adult: number, investment: number, authority: number): string => {
    const strengths = [];
    if (peer >= 4) strengths.push("peer relationships");
    if (adult >= 4) strengths.push("staff relationships");
    if (investment >= 4) strengths.push("program engagement");
    if (authority >= 4) strengths.push("rule compliance");
    return strengths.length > 0 ? `Strong in: ${strengths.join(', ')}` : "Areas of strength to be identified";
  };

  const generateLowPointAreas = (peer: number, adult: number, investment: number, authority: number): string => {
    const struggles = [];
    if (peer < 3) struggles.push("peer relationships");
    if (adult < 3) struggles.push("staff relationships");
    if (investment < 3) struggles.push("program engagement");
    if (authority < 3) struggles.push("rule compliance");
    return struggles.length > 0 ? `Areas needing improvement: ${struggles.join(', ')}` : "No significant struggle areas identified";
  };

  const generateTrendsAnalysis = (behaviorPoints: any[], dailyRatings: any[]): string => {
    if (behaviorPoints.length < 2) return "Insufficient data for trend analysis";

    const recentAvg = behaviorPoints.slice(-7).reduce((sum, p) => sum + (p.totalPoints || 0), 0) /
                      Math.max(1, behaviorPoints.slice(-7).length);
    const earlierAvg = behaviorPoints.slice(0, -7).reduce((sum, p) => sum + (p.totalPoints || 0), 0) /
                       Math.max(1, behaviorPoints.slice(0, -7).length);

    if (earlierAvg === 0) return "Positive trend established this reporting period";

    const trend = recentAvg > earlierAvg ? "improving" : recentAvg < earlierAvg ? "needs improvement" : "stable";
    return `Point earning trending ${trend} (Recent avg: ${Math.round(recentAvg)}, Overall avg: ${Math.round(earlierAvg)})`;
  };

  const generateAcademicProgress = (youth: Youth): string => {
    if (youth.academicStrengths || youth.academicChallenges) {
      return `${youth.academicStrengths ? `Strengths: ${youth.academicStrengths}. ` : ''}${youth.academicChallenges ? `Areas for growth: ${youth.academicChallenges}.` : ''}`;
    }
    return `${youth.firstName} is enrolled in ${youth.currentGrade || 'education program'}. Academic progress monitoring ongoing.`;
  };

  const generateSchoolPerformance = (youth: Youth): string => {
    return `Current school: ${youth.currentSchool || youth.lastSchoolAttended || 'Not specified'}. ${youth.schoolContact ? `Contact: ${youth.schoolContact}` : ''} ${youth.schoolPhone ? `Phone: ${youth.schoolPhone}` : ''}`.trim();
  };

  const generateBehavioralSummary = (behaviorPoints: any[], progressNotes: any[]): string => {
    const totalPoints = behaviorPoints.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
    const avgPoints = behaviorPoints.length > 0 ? Math.round(totalPoints / behaviorPoints.length) : 0;

    let summary = `${behaviorPoints.length} days tracked with ${totalPoints} total points earned (average: ${avgPoints} points/day). `;

    if (progressNotes.length > 0) {
      const recentNotes = progressNotes.slice(-3);
      summary += `Recent progress notes indicate ${recentNotes.length} documented activities/interactions.`;
    } else {
      summary += "Regular program participation observed.";
    }

    return summary;
  };

  const generateSocialProgress = (peerAvg: number, adultAvg: number): string => {
    const peerDesc = peerAvg >= 4 ? "excellent" : peerAvg >= 3 ? "good" : peerAvg >= 2 ? "developing" : "needs improvement";
    const adultDesc = adultAvg >= 4 ? "excellent" : adultAvg >= 3 ? "good" : adultAvg >= 2 ? "developing" : "needs improvement";
    return `Peer interactions rated ${peerDesc} (avg: ${peerAvg}/5). Staff relationships rated ${adultDesc} (avg: ${adultAvg}/5).`;
  };

  const generateEmotionalRegulation = (authorityAvg: number): string => {
    const level = authorityAvg >= 4 ? "high" : authorityAvg >= 3 ? "moderate" : "developing";
    return `${level} level of emotional regulation and rule compliance observed (avg rating: ${authorityAvg}/5).`;
  };

  const generatePeerRelationships = (peerAvg: number): string => {
    const desc = peerAvg >= 4 ? "strong positive relationships" : peerAvg >= 3 ? "generally positive" : "areas for development";
    return `Demonstrates ${desc} with peers (avg rating: ${peerAvg}/5).`;
  };

  const generateTreatmentGoals = (youth: Youth): string => {
    if (youth.treatmentFocus) {
      const goals = [];
      if (youth.treatmentFocus.excessiveDependency) goals.push("Reduce excessive dependency");
      if (youth.treatmentFocus.withdrawalIsolation) goals.push("Increase social engagement");
      if (youth.treatmentFocus.parentChildRelationship) goals.push("Improve parent-child relationships");
      if (youth.treatmentFocus.peerRelationship) goals.push("Develop positive peer relationships");
      if (youth.treatmentFocus.acceptanceOfAuthority) goals.push("Accept authority figures");
      if (youth.treatmentFocus.lying) goals.push("Address dishonest behavior");
      if (youth.treatmentFocus.poorAcademicAchievement) goals.push("Improve academic performance");
      if (youth.treatmentFocus.poorSelfEsteem) goals.push("Build self-esteem");
      if (youth.treatmentFocus.manipulative) goals.push("Address manipulative behaviors");
      return goals.length > 0 ? `Treatment focuses on: ${goals.join(', ')}` : "Individualized treatment plan in development";
    }
    return "Treatment goals focused on behavioral modification, skill development, and emotional regulation";
  };

  const generateTreatmentProgress = (progressNotes: any[]): string => {
    if (progressNotes.length === 0) return "Progress notes documenting treatment engagement and goal achievement";
    const recentProgress = progressNotes.slice(-5);
    return `${recentProgress.length} recent progress notes documenting treatment progress and skill building`;
  };

  const generateTherapyParticipation = (youth: Youth): string => {
    if (youth.currentCounseling && youth.currentCounseling.length > 0) {
      return `Participating in: ${youth.currentCounseling.join(', ')}. ${youth.therapistName ? `Therapist: ${youth.therapistName}` : ''}`;
    }
    return "Regular therapy participation as scheduled by treatment team";
  };

  const generateRiskFactors = (youth: Youth): string => {
    const factors = [];
    if (youth.gangInvolvement) factors.push("gang involvement");
    if (youth.historyVandalism) factors.push("history of vandalism");
    if (youth.familyViolentCrimes) factors.push("family history of violent crimes");
    if (youth.selfHarmHistory?.length > 0) factors.push("self-harm history");
    if (youth.historyPhysicallyHurting) factors.push("history of physical harm to others");

    if (factors.length > 0) {
      return `Identified risk factors: ${factors.join(', ')}. Risk mitigation strategies include close supervision, skill-building activities, and therapeutic interventions.`;
    }
    return "Regular risk assessment with no elevated risk factors identified";
  };

  const generatePlacementRecommendation = (youth: Youth): string => {
    const level = typeof youth.level === 'number' ? youth.level : parseInt(youth.level || '5');
    if (level <= 2) {
      return "Continue current placement with regular progress monitoring";
    } else if (level === 3) {
      return "Prepare for transition to less restrictive environment";
    } else {
      return "Continue intensive level of care with gradual privilege increases";
    }
  };

  const generateRecommendationReason = (youth: Youth): string => {
    return "Based on current behavioral performance, participation in therapeutic activities, and achievement of treatment goals";
  };

  const generateFutureGoals = (youth: Youth): string => {
    return "Continue skill development, academic progress, and positive relationships to prepare for next phase of care";
  };

  // Load saved data or auto-populate on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!youth?.id) return;

      const saveKey = `monthly-progress-${youth.id}-${selectedMonth}`;
      const saved = localStorage.getItem(saveKey);

      if (saved) {
        // If saved data exists, load it first
        try {
          const savedData = JSON.parse(saved);

          // Auto-populate to get fresh data from youth profile
          await autoPopulateForm();

          // Then merge saved data on top, preserving user edits
          // Saved data takes priority over auto-populated data
          setReportData(prev => ({ ...prev, ...savedData }));
        } catch (error) {
          console.error("Error loading saved data:", error);
          await autoPopulateForm();
        }
      } else {
        // No saved data, auto-populate form with youth profile data
        await autoPopulateForm();
      }
    };

    loadData();
  }, [youth?.id, selectedMonth]);

  // Auto-save functionality
  useEffect(() => {
    const autoSave = () => {
      if (youth?.id) {
        const saveKey = `monthly-progress-${youth.id}-${selectedMonth}`;
        localStorage.setItem(saveKey, JSON.stringify(reportData));
      }
    };

    const timeoutId = setTimeout(autoSave, 2000);
    return () => clearTimeout(timeoutId);
  }, [reportData, youth?.id, selectedMonth]);

  const handleFieldChange = (field: keyof MonthlyReportData, value: string) => {
    setReportData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    try {
      const saveKey = `monthly-progress-${youth.id}-${selectedMonth}`;
      localStorage.setItem(saveKey, JSON.stringify(reportData));
      toast({
        title: "Report Saved",
        description: "Monthly progress report has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Save Error",
        description: "Failed to save the report",
        variant: "destructive"
      });
    }
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;

    try {
      const selectedDate = new Date(selectedMonth + "-01");
      const filename = `Monthly_Progress_${youth.lastName}_${youth.firstName}_${format(selectedDate, "MMMM_yyyy")}.pdf`;
      await exportElementToPDF(printRef.current, filename);
      toast({
        title: "Success",
        description: "Monthly progress report PDF has been generated and downloaded",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    setReportData({
      fullLegalName: "",
      preferredName: "",
      dateOfBirth: "",
      age: "",
      dateOfAdmission: "",
      lengthOfStay: "",
      currentLevel: "",
      currentPlacement: "",
      probationOfficer: "",
      guardiansInfo: "",
      schoolPlacement: "",
      currentDiagnoses: "",
      highPointAreas: "",
      lowPointAreas: "",
      trendsOverTime: "",
      incentivesEarned: "",
      behavioralSummary: "",
      academicProgress: "",
      schoolPerformance: "",
      educationalGoals: "",
      socialProgress: "",
      emotionalRegulation: "",
      peerRelationships: "",
      treatmentGoals: "",
      treatmentProgress: "",
      therapyParticipation: "",
      riskLevel: "",
      riskFactors: "",
      primaryColor: "",
      secondaryColor: "",
      colorProfile: "",
      placementRecommendation: "",
      recommendationReason: "",
      futureGoals: "",
      preparedBy: "",
      reportDate: format(new Date(), "yyyy-MM-dd"),
      month: format(new Date(), "MMMM"),
      year: format(new Date(), "yyyy")
    });
    
    // Clear saved data
    if (youth?.id) {
      const saveKey = `monthly-progress-${youth.id}-${selectedMonth}`;
      localStorage.removeItem(saveKey);
    }
    
    toast({
      title: "Form Reset",
      description: "All form data has been cleared",
    });
  };

  if (!youth) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Please select a youth to generate a monthly progress report.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4 flex-wrap">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Progress Report - {youth.firstName} {youth.lastName}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Progress
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
              >
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-red-600 hover:text-red-700"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Form
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Report Month</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Prepared By</Label>
              <Input
                value={reportData.preparedBy}
                onChange={(e) => handleFieldChange('preparedBy', e.target.value)}
                placeholder="Staff name"
              />
            </div>
            <div className="space-y-2">
              <Label>Report Date</Label>
              <Input
                type="date"
                value={reportData.reportDate}
                onChange={(e) => handleFieldChange('reportDate', e.target.value)}
              />
            </div>
          </div>

          {/* Youth Profile Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Youth Profile Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Legal Name</Label>
                <Input
                  value={reportData.fullLegalName}
                  onChange={(e) => handleFieldChange('fullLegalName', e.target.value)}
                  placeholder="Full legal name"
                />
              </div>
              <div className="space-y-2">
                <Label>Preferred Name</Label>
                <Input
                  value={reportData.preferredName}
                  onChange={(e) => handleFieldChange('preferredName', e.target.value)}
                  placeholder="Preferred name"
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={reportData.dateOfBirth}
                  onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input
                  value={reportData.age}
                  onChange={(e) => handleFieldChange('age', e.target.value)}
                  placeholder="Age"
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Admission</Label>
                <Input
                  type="date"
                  value={reportData.dateOfAdmission}
                  onChange={(e) => handleFieldChange('dateOfAdmission', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Length of Stay</Label>
                <Input
                  value={reportData.lengthOfStay}
                  onChange={(e) => handleFieldChange('lengthOfStay', e.target.value)}
                  placeholder="e.g., 6 months"
                />
              </div>
              <div className="space-y-2">
                <Label>Current Level</Label>
                <Select value={reportData.currentLevel} onValueChange={(value) => handleFieldChange('currentLevel', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Intake">Intake</SelectItem>
                    <SelectItem value="Level 1">Level 1</SelectItem>
                    <SelectItem value="Level 2">Level 2</SelectItem>
                    <SelectItem value="Level 3">Level 3</SelectItem>
                    <SelectItem value="Level 4">Level 4</SelectItem>
                    <SelectItem value="Level 5">Level 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Current Placement</Label>
                <Input
                  value={reportData.currentPlacement}
                  onChange={(e) => handleFieldChange('currentPlacement', e.target.value)}
                  placeholder="Current placement"
                />
              </div>
              <div className="space-y-2">
                <Label>Probation Officer</Label>
                <Input
                  value={reportData.probationOfficer}
                  onChange={(e) => handleFieldChange('probationOfficer', e.target.value)}
                  placeholder="Probation officer name"
                />
              </div>
              <div className="space-y-2">
                <Label>School Placement</Label>
                <Input
                  value={reportData.schoolPlacement}
                  onChange={(e) => handleFieldChange('schoolPlacement', e.target.value)}
                  placeholder="School placement"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Guardians Information</Label>
              <Textarea
                value={reportData.guardiansInfo}
                onChange={(e) => handleFieldChange('guardiansInfo', e.target.value)}
                placeholder="Guardian/parent information"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Current Diagnoses</Label>
              <Textarea
                value={reportData.currentDiagnoses}
                onChange={(e) => handleFieldChange('currentDiagnoses', e.target.value)}
                placeholder="Current diagnoses and treatment needs"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Program Participation & Daily Points */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Program Participation & Daily Points</h3>
            <div className="space-y-2">
              <Label>Incentives Earned</Label>
              <Input
                value={reportData.incentivesEarned}
                onChange={(e) => handleFieldChange('incentivesEarned', e.target.value)}
                placeholder="Incentives earned/lost"
              />
            </div>
            <div className="space-y-2">
              <Label>High Point Areas (Strengths)</Label>
              <Textarea
                value={reportData.highPointAreas}
                onChange={(e) => handleFieldChange('highPointAreas', e.target.value)}
                placeholder="Areas where youth performs well"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Low Point Areas (Struggles)</Label>
              <Textarea
                value={reportData.lowPointAreas}
                onChange={(e) => handleFieldChange('lowPointAreas', e.target.value)}
                placeholder="Areas where youth struggles"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Trends Over Time</Label>
              <Textarea
                value={reportData.trendsOverTime}
                onChange={(e) => handleFieldChange('trendsOverTime', e.target.value)}
                placeholder="Progress trends and patterns"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Academic Progress */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Academic Progress</h3>
            <div className="space-y-2">
              <Label>Academic Progress</Label>
              <Textarea
                value={reportData.academicProgress}
                onChange={(e) => handleFieldChange('academicProgress', e.target.value)}
                placeholder="Overall academic progress and achievements"
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>School Performance</Label>
              <Textarea
                value={reportData.schoolPerformance}
                onChange={(e) => handleFieldChange('schoolPerformance', e.target.value)}
                placeholder="Specific school performance details"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Educational Goals</Label>
              <Textarea
                value={reportData.educationalGoals}
                onChange={(e) => handleFieldChange('educationalGoals', e.target.value)}
                placeholder="Educational goals and objectives"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Behavioral Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Behavioral Summary</h3>
            <div className="space-y-2">
              <Label>Behavioral Summary</Label>
              <Textarea
                value={reportData.behavioralSummary}
                onChange={(e) => handleFieldChange('behavioralSummary', e.target.value)}
                placeholder="Summary of behavioral progress and incidents"
                className="min-h-[120px]"
              />
            </div>
          </div>

          {/* Social/Emotional Development */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Social/Emotional Development</h3>
            <div className="space-y-2">
              <Label>Social Progress</Label>
              <Textarea
                value={reportData.socialProgress}
                onChange={(e) => handleFieldChange('socialProgress', e.target.value)}
                placeholder="Social development and skills progress"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Emotional Regulation</Label>
              <Textarea
                value={reportData.emotionalRegulation}
                onChange={(e) => handleFieldChange('emotionalRegulation', e.target.value)}
                placeholder="Emotional regulation progress and strategies"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Peer Relationships</Label>
              <Textarea
                value={reportData.peerRelationships}
                onChange={(e) => handleFieldChange('peerRelationships', e.target.value)}
                placeholder="Peer relationships and social interactions"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Treatment Progress */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Treatment Progress</h3>
            <div className="space-y-2">
              <Label>Treatment Goals</Label>
              <Textarea
                value={reportData.treatmentGoals}
                onChange={(e) => handleFieldChange('treatmentGoals', e.target.value)}
                placeholder="Current treatment goals and objectives"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Treatment Progress</Label>
              <Textarea
                value={reportData.treatmentProgress}
                onChange={(e) => handleFieldChange('treatmentProgress', e.target.value)}
                placeholder="Progress toward treatment goals"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Therapy Participation</Label>
              <Textarea
                value={reportData.therapyParticipation}
                onChange={(e) => handleFieldChange('therapyParticipation', e.target.value)}
                placeholder="Participation in therapy and counseling sessions"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Risk Assessment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select value={reportData.riskLevel} onValueChange={(value) => handleFieldChange('riskLevel', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Very High">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Risk Factors</Label>
              <Textarea
                value={reportData.riskFactors}
                onChange={(e) => handleFieldChange('riskFactors', e.target.value)}
                placeholder="Identified risk factors and mitigation strategies"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Real Colors Profile */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Real Colors Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <Select value={reportData.primaryColor} onValueChange={(value) => handleFieldChange('primaryColor', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Orange">Orange</SelectItem>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Green">Green</SelectItem>
                    <SelectItem value="Blue">Blue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <Select value={reportData.secondaryColor} onValueChange={(value) => handleFieldChange('secondaryColor', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select secondary color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Orange">Orange</SelectItem>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Green">Green</SelectItem>
                    <SelectItem value="Blue">Blue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color Profile Analysis</Label>
              <Textarea
                value={reportData.colorProfile}
                onChange={(e) => handleFieldChange('colorProfile', e.target.value)}
                placeholder="Real Colors profile analysis and implications"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Placement Recommendation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Placement Recommendation</h3>
            <div className="space-y-2">
              <Label>Placement Recommendation</Label>
              <Textarea
                value={reportData.placementRecommendation}
                onChange={(e) => handleFieldChange('placementRecommendation', e.target.value)}
                placeholder="Recommended placement or next steps"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Recommendation Rationale</Label>
              <Textarea
                value={reportData.recommendationReason}
                onChange={(e) => handleFieldChange('recommendationReason', e.target.value)}
                placeholder="Rationale for placement recommendation"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Future Goals</Label>
              <Textarea
                value={reportData.futureGoals}
                onChange={(e) => handleFieldChange('futureGoals', e.target.value)}
                placeholder="Future goals and objectives"
                className="min-h-[80px]"
              />
            </div>
          </div>
          
        </CardContent>
      </Card>

      {/* Printable Report */}
      <div ref={printRef} className="print-section bg-white text-black p-8 rounded-lg border">
        <ReportHeader
          subtitle="Monthly Progress Report"
          detail={format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
        />

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <strong>Report Date:</strong>{" "}
            <FormattedText text={reportData.reportDate} />
          </div>
          <div>
            <strong>Prepared By:</strong>{" "}
            <FormattedText text={reportData.preparedBy} />
          </div>
        </div>

        {/* Youth Information */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">1. Youth Profile Information</h3>
          <div className="space-y-2 ml-4">
            <div>
              <strong>Full Legal Name:</strong>{" "}
              <FormattedText text={reportData.fullLegalName || `${youth.firstName} ${youth.lastName}`} />
            </div>
            <div>
              <strong>Preferred Name:</strong>{" "}
              <FormattedText text={reportData.preferredName} />
            </div>
            <div>
              <strong>Date of Birth:</strong>{" "}
              <FormattedText text={reportData.dateOfBirth} />
            </div>
            <div>
              <strong>Age:</strong>{" "}
              <FormattedText text={reportData.age} />
            </div>
            <div>
              <strong>Date of Admission:</strong>{" "}
              <FormattedText text={reportData.dateOfAdmission} />
            </div>
            <div>
              <strong>Length of Stay:</strong>{" "}
              <FormattedText text={reportData.lengthOfStay} />
            </div>
            <div>
              <strong>Current Level:</strong>{" "}
              <FormattedText text={reportData.currentLevel} />
            </div>
            <div>
              <strong>Current Placement:</strong>{" "}
              <FormattedText text={reportData.currentPlacement} />
            </div>
            <div>
              <strong>Probation Officer:</strong>{" "}
              <FormattedText text={reportData.probationOfficer} />
            </div>
            <div>
              <strong>School Placement:</strong>{" "}
              <FormattedText text={reportData.schoolPlacement} />
            </div>
            <div>
              <strong>Guardians Information:</strong>{" "}
              <FormattedText text={reportData.guardiansInfo} />
            </div>
            <div>
              <strong>Current Diagnoses:</strong>{" "}
              <FormattedText text={reportData.currentDiagnoses} />
            </div>
          </div>
        </div>

        {/* Program Participation */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">2. Program Participation & Daily Points</h3>
          <div className="space-y-2 ml-4">
            <div>
              <strong>High Point Areas (Strengths):</strong>{" "}
              <FormattedText text={reportData.highPointAreas} />
            </div>
            <div>
              <strong>Low Point Areas (Struggles):</strong>{" "}
              <FormattedText text={reportData.lowPointAreas} />
            </div>
            <div>
              <strong>Trends Over Time:</strong>{" "}
              <FormattedText text={reportData.trendsOverTime} />
            </div>
            <div>
              <strong>Incentives Earned:</strong>{" "}
              <FormattedText text={reportData.incentivesEarned} />
            </div>
          </div>
        </div>

        {/* Academic Progress */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">3. Academic Progress</h3>
          <div className="space-y-2 ml-4">
            <div>
              <strong>Academic Progress:</strong>{" "}
              <FormattedText text={reportData.academicProgress} />
            </div>
            <div>
              <strong>School Performance:</strong>{" "}
              <FormattedText text={reportData.schoolPerformance} />
            </div>
            <div>
              <strong>Educational Goals:</strong>{" "}
              <FormattedText text={reportData.educationalGoals} />
            </div>
          </div>
        </div>

        {/* Behavioral Summary */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">4. Behavioral Summary</h3>
          <FormattedText text={reportData.behavioralSummary} as="div" className="ml-4" />
        </div>

        {/* Social/Emotional Development */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">5. Social/Emotional Development</h3>
          <div className="space-y-2 ml-4">
            <div>
              <strong>Social Progress:</strong>{" "}
              <FormattedText text={reportData.socialProgress} />
            </div>
            <div>
              <strong>Emotional Regulation:</strong>{" "}
              <FormattedText text={reportData.emotionalRegulation} />
            </div>
            <div>
              <strong>Peer Relationships:</strong>{" "}
              <FormattedText text={reportData.peerRelationships} />
            </div>
          </div>
        </div>

        {/* Treatment Progress */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">6. Treatment Progress</h3>
          <div className="space-y-2 ml-4">
            <div>
              <strong>Treatment Goals:</strong>{" "}
              <FormattedText text={reportData.treatmentGoals} />
            </div>
            <div>
              <strong>Treatment Progress:</strong>{" "}
              <FormattedText text={reportData.treatmentProgress} />
            </div>
            <div>
              <strong>Therapy Participation:</strong>{" "}
              <FormattedText text={reportData.therapyParticipation} />
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">7. Risk Assessment</h3>
          <div className="space-y-2 ml-4">
            <div>
              <strong>Risk Level:</strong>{" "}
              <FormattedText text={reportData.riskLevel} />
            </div>
            <div>
              <strong>Risk Factors:</strong>{" "}
              <FormattedText text={reportData.riskFactors} />
            </div>
          </div>
        </div>

        {/* Real Colors Profile */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">8. Real Colors Profile</h3>
          <div className="space-y-2 ml-4">
            <div>
              <strong>Primary Color:</strong>{" "}
              <FormattedText text={reportData.primaryColor} />
            </div>
            <div>
              <strong>Secondary Color:</strong>{" "}
              <FormattedText text={reportData.secondaryColor} />
            </div>
            <div>
              <strong>Color Profile Analysis:</strong>{" "}
              <FormattedText text={reportData.colorProfile} />
            </div>
          </div>
        </div>

        {/* Placement Recommendation */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">9. Placement Recommendation</h3>
          <div className="space-y-2 ml-4">
            <div>
              <strong>Placement Recommendation:</strong>{" "}
              <FormattedText text={reportData.placementRecommendation} />
            </div>
            <div>
              <strong>Recommendation Rationale:</strong>{" "}
              <FormattedText text={reportData.recommendationReason} />
            </div>
            <div>
              <strong>Future Goals:</strong>{" "}
              <FormattedText text={reportData.futureGoals} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 mt-8">
          <div className="text-center text-sm text-gray-600">
            <p>Report generated on {reportData.reportDate}</p>
            <p>Prepared by: {reportData.preparedBy}</p>
            <p>Heartland Boys Home - Monthly Progress Report</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            
            .print-section,
            .print-section * {
              visibility: visible;
            }
            
            .print-section {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 20pt !important;
              margin: 0 !important;
              background: white !important;
              color: black !important;
              font-size: 12pt !important;
              line-height: 1.4 !important;
              box-shadow: none !important;
              border: none !important;
            }
            
            .print-section h1 {
              font-size: 20pt !important;
              margin-bottom: 12pt !important;
              color: black !important;
            }
            
            .print-section h2 {
              font-size: 16pt !important;
              margin-bottom: 10pt !important;
              color: black !important;
            }
            
            .print-section h3 {
              font-size: 14pt !important;
              margin-bottom: 6pt !important;
              margin-top: 12pt !important;
              color: black !important;
            }
            
            .print-section p, .print-section div {
              font-size: 11pt !important;
              margin-bottom: 6pt !important;
              color: black !important;
            }
            
            .print-section .grid {
              display: block !important;
            }
            
            .print-section .grid-cols-2 > div {
              display: inline-block !important;
              width: 48% !important;
              margin-right: 4% !important;
              vertical-align: top !important;
            }
            
            .print-section .grid-cols-2 > div:nth-child(2n) {
              margin-right: 0 !important;
            }
            
            .print-section .space-y-2 > * + * {
              margin-top: 6pt !important;
            }
            
            .print-section .space-y-4 > * + * {
              margin-top: 12pt !important;
            }
            
            .print-section .space-y-6 > * + * {
              margin-top: 18pt !important;
            }
            
            .print-section .border-b {
              border-bottom: 1pt solid black !important;
              padding-bottom: 6pt !important;
              margin-bottom: 12pt !important;
            }
            
            .print-section .border-t {
              border-top: 1pt solid black !important;
              padding-top: 12pt !important;
              margin-top: 18pt !important;
            }
            
            .print-section strong {
              font-weight: bold !important;
              color: black !important;
            }
            
            .print-section .ml-4 {
              margin-left: 24pt !important;
            }
            
            @page {
              margin: 0.75in !important;
              size: letter !important;
            }
            
            .print-section > div {
              page-break-inside: avoid !important;
            }
          }
        `
      }} />
    </div>
  );
};
