import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { ReportCenter } from "@/components/reports/ReportCenter";
import { ReportTypeSelector, type ReportTypeKey } from "@/components/reports/ReportTypeSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useYouth } from "@/hooks/useSupabase";
import { type Youth } from "@/integrations/firebase/services";
import { BottomNav } from "@/components/layout/BottomNav";

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

            {/* Report Generation */}
            {selectedYouth && selectedReportType && (
              <ReportCenter
                youthId={selectedYouthId}
                youth={selectedYouth}
                preselectedType={selectedReportType}
              />
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
