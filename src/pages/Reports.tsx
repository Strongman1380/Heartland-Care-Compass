import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { ReportTypeSelector, type ReportTypeKey } from "@/components/reports/ReportTypeSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useYouth } from "@/hooks/useSupabase";
import { type Youth } from "@/integrations/firebase/services";
import { BottomNav } from "@/components/layout/BottomNav";

// Report components
import { HeartlandMonthlyProgressReport } from "@/components/reports/HeartlandMonthlyProgressReport";
import { CourtReport } from "@/components/reports/CourtReport";
import { DpnReport } from "@/components/reports/DpnReport";
import { ProgressEvaluationReport } from "@/components/reports/ProgressEvaluationReport";
import { ServicePlanReport } from "@/components/reports/ServicePlanReport";
import { DischargeReport } from "@/components/reports/DischargeReport";

const Reports = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string>("");
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<ReportTypeKey | null>(null);

  const { youths, loading, loadYouths } = useYouth();

  useEffect(() => {
    loadYouths();
  }, []);

  useEffect(() => {
    if (selectedYouthId) {
      const youth = youths.find(y => y.id === selectedYouthId);
      setSelectedYouth(youth || null);
    } else {
      setSelectedYouth(null);
    }
  }, [selectedYouthId, youths]);

  // Reset report type when youth changes
  useEffect(() => {
    setSelectedReportType(null);
  }, [selectedYouthId]);

  const renderReport = () => {
    if (!selectedYouth || !selectedReportType) return null;

    switch (selectedReportType) {
      case "progressMonthly":
        return <HeartlandMonthlyProgressReport key={selectedYouth.id} youth={selectedYouth} />;
      case "court":
        return <CourtReport key={selectedYouth.id} youth={selectedYouth} />;
      case "dpnBiWeekly":
        return <DpnReport key={`${selectedYouth.id}-biweekly`} youth={selectedYouth} variant="biweekly" />;
      case "dpnMonthly":
        return <DpnReport key={`${selectedYouth.id}-monthly`} youth={selectedYouth} variant="monthly" />;
      case "evalWeekly":
        return <ProgressEvaluationReport key={`${selectedYouth.id}-weekly`} youth={selectedYouth} variant="weekly" />;
      case "evalMonthly":
        return <ProgressEvaluationReport key={`${selectedYouth.id}-monthly-eval`} youth={selectedYouth} variant="monthly" />;
      case "servicePlan":
        return <ServicePlanReport key={selectedYouth.id} youth={selectedYouth} />;
      case "discharge":
        return <DischargeReport key={selectedYouth.id} youth={selectedYouth} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent">
            Reports
          </h1>
          <p className="text-sm text-red-700 mt-1">Select a youth and report type to generate</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading youth data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Youth Selector */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">1. Select Youth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-md">
                  <Select value={selectedYouthId} onValueChange={setSelectedYouthId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a youth..." />
                    </SelectTrigger>
                    <SelectContent>
                      {youths.map((youth) => (
                        <SelectItem key={youth.id} value={youth.id}>
                          {youth.firstName} {youth.lastName} — Level {youth.level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Report Type Selector */}
            {selectedYouth && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">2. Choose Report Type</CardTitle>
                  <CardDescription>Select the type of report to generate for {selectedYouth.firstName}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ReportTypeSelector
                    selected={selectedReportType}
                    onSelect={setSelectedReportType}
                  />
                </CardContent>
              </Card>
            )}

            {/* Rendered Report */}
            {selectedYouth && selectedReportType && (
              <div className="mt-2">
                {renderReport()}
              </div>
            )}

            {!selectedYouthId && youths.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="text-center py-8">
                  <p className="text-gray-600">Please select a youth to get started.</p>
                </CardContent>
              </Card>
            )}

            {youths.length === 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="text-center py-8">
                  <p className="text-gray-600">No youth profiles available.</p>
                  <p className="text-sm text-gray-500 mt-2">Add youth profiles from the main dashboard.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Reports;
