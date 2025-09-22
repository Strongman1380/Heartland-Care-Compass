import { Youth } from "@/integrations/supabase/services";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MentalHealthProfileTabProps {
  youth: Youth;
}

export const MentalHealthProfileTab = ({ youth }: MentalHealthProfileTabProps) => {
  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Not available";
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return format(date, "MMMM d, yyyy");
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  // Helper functions to check if data exists
  const hasRiskLevel = youth.hyrnaRiskLevel && 
                      typeof youth.hyrnaRiskLevel === 'string' && 
                      youth.hyrnaRiskLevel.trim() !== '';
                      
  const hasScore = youth.hyrnaScore && 
                  typeof youth.hyrnaScore === 'number' && 
                  youth.hyrnaScore > 0;
                  
  const hasAssessmentDate = youth.hyrnaAssessmentDate && 
                           youth.hyrnaAssessmentDate !== null && 
                           youth.hyrnaAssessmentDate !== '';
  
  const hasAnyHyrnaData = hasRiskLevel || hasScore || hasAssessmentDate;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-red-800 mb-2">Mental Health Information</h3>
        <div className="p-3 bg-gray-50 rounded-md">
          {youth.mentalHealthInfo || "No mental health information available"}
        </div>
      </div>

      {/* HYRNA Risk Assessment */}
      <div>
        <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          HYRNA Risk Assessment
        </h3>
        <div className="p-3 bg-gray-50 rounded-md">
          {hasAnyHyrnaData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hasRiskLevel ? (
                <div>
                  <span className="text-sm font-medium text-gray-600 block mb-1">Risk Level:</span>
                  <Badge variant={
                    youth.hyrnaRiskLevel!.toLowerCase() === 'high' ? 'destructive' :
                    youth.hyrnaRiskLevel!.toLowerCase() === 'medium' ? 'default' : 'secondary'
                  }>
                    {youth.hyrnaRiskLevel}
                  </Badge>
                </div>
              ) : null}
              
              {hasScore ? (
                <div>
                  <span className="text-sm font-medium text-gray-600 block mb-1">HYRNA Score:</span>
                  <span className="text-lg font-semibold">{youth.hyrnaScore}</span>
                </div>
              ) : null}
              
              {hasAssessmentDate ? (
                <div>
                  <span className="text-sm font-medium text-gray-600 block mb-1">Assessment Date:</span>
                  <span>{formatDate(youth.hyrnaAssessmentDate)}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-gray-500">
              <p>No HYRNA risk assessment data available.</p>
              <p className="text-sm mt-1">Use the Edit Profile button to add HYRNA assessment details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mental Health Diagnoses */}
      {youth.currentDiagnoses && (
        <div>
          <h3 className="font-semibold text-red-800 mb-2">Current Diagnoses</h3>
          <div className="p-3 bg-gray-50 rounded-md">
            {youth.currentDiagnoses}
          </div>
        </div>
      )}
    </div>
  );
};
