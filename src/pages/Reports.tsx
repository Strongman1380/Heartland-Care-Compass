import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { useYouth } from "@/hooks/useSupabase";
import { BottomNav } from "@/components/layout/BottomNav";
import { YouthReportWorkspace } from "@/components/reports/YouthReportWorkspace";

const Reports = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string>("");
  const { youths, loading, loadYouths } = useYouth();

  useEffect(() => {
    loadYouths();
  }, []);

  const selectedYouth = selectedYouthId ? youths.find((y) => y.id === selectedYouthId) || null : null;

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
          <YouthReportWorkspace
            youths={youths}
            youth={selectedYouth}
            selectedYouthId={selectedYouthId}
            onSelectedYouthIdChange={setSelectedYouthId}
            title="Reports"
            description="Select a youth and report type to generate."
          />
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Reports;
