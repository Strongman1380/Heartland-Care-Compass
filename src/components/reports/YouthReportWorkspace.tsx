import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportTypeSelector, type ReportTypeKey } from "./ReportTypeSelector";
import { HeartlandMonthlyProgressReport } from "./HeartlandMonthlyProgressReport";
import { CourtReport } from "./CourtReport";
import { DpnReport } from "./DpnReport";
import { ProgressEvaluationReport } from "./ProgressEvaluationReport";
import { ServicePlanReport } from "./ServicePlanReport";
import { DischargeReport } from "./DischargeReport";
import type { Youth } from "@/integrations/firebase/services";

interface YouthReportWorkspaceProps {
  youths?: Youth[];
  youth?: Youth | null;
  selectedYouthId?: string;
  onSelectedYouthIdChange?: (id: string) => void;
  title?: string;
  description?: string;
}

export const YouthReportWorkspace = ({
  youths = [],
  youth = null,
  selectedYouthId = "",
  onSelectedYouthIdChange,
  title = "Report Workspace",
  description = "Generate reports for the selected youth.",
}: YouthReportWorkspaceProps) => {
  const [selectedReportType, setSelectedReportType] = useState<ReportTypeKey | null>(null);

  useEffect(() => {
    setSelectedReportType(null);
  }, [selectedYouthId, youth?.id]);

  const renderReport = () => {
    if (!youth || !selectedReportType) return null;

    switch (selectedReportType) {
      case "progressMonthly":
        return <HeartlandMonthlyProgressReport key={youth.id} youth={youth} />;
      case "court":
        return <CourtReport key={youth.id} youth={youth} />;
      case "dpnBiWeekly":
        return <DpnReport key={`${youth.id}-biweekly`} youth={youth} variant="biweekly" />;
      case "dpnMonthly":
        return <DpnReport key={`${youth.id}-monthly`} youth={youth} variant="monthly" />;
      case "evalWeekly":
        return <ProgressEvaluationReport key={`${youth.id}-weekly`} youth={youth} variant="weekly" />;
      case "evalMonthly":
        return <ProgressEvaluationReport key={`${youth.id}-monthly-eval`} youth={youth} variant="monthly" />;
      case "servicePlan":
        return <ServicePlanReport key={`${youth.id}-service-plan`} youth={youth} />;
      case "discharge":
        return <DischargeReport key={`${youth.id}-discharge`} youth={youth} />;
      default:
        return null;
    }
  };

  const isYouthLocked = !onSelectedYouthIdChange;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-red-800">{title}</h2>
        <p className="text-sm text-red-700 mt-1">{description}</p>
      </div>

      {!isYouthLocked && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1. Select Youth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Select value={selectedYouthId} onValueChange={onSelectedYouthIdChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a youth..." />
                </SelectTrigger>
                <SelectContent>
                  {youths.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.firstName} {item.lastName} - Level {item.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {youth && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isYouthLocked ? "Choose Report Type" : "2. Choose Report Type"}
            </CardTitle>
            <CardDescription>
              Select the report to generate for {youth.firstName}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportTypeSelector selected={selectedReportType} onSelect={setSelectedReportType} />
          </CardContent>
        </Card>
      )}

      {youth && selectedReportType && <div>{renderReport()}</div>}

      {!youth && !isYouthLocked && youths.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-8">
            <p className="text-gray-600">Please select a youth to get started.</p>
          </CardContent>
        </Card>
      )}

      {!youth && youths.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-8">
            <p className="text-gray-600">No youth profiles available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
