import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { useYouth } from "@/hooks/useSupabase";
import { BottomNav } from "@/components/layout/BottomNav";
import { YouthReportWorkspace } from "@/components/reports/YouthReportWorkspace";
import { Button } from "@/components/ui/button";
import { FileJson } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Reports = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string>("");
  const { youths, loading, loadYouths } = useYouth();
  const navigate = useNavigate();

  useEffect(() => {
    loadYouths();
  }, []);

  const selectedYouth = selectedYouthId ? youths.find((y) => y.id === selectedYouthId) || null : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent">
                Reports
              </h1>
              <p className="text-sm text-red-700 mt-1">Select a youth and report type to generate</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/data-export")}
              className="flex items-center gap-2 border-red-200 text-red-800 hover:bg-red-50"
            >
              <FileJson className="h-4 w-4" />
              JSON Export
            </Button>
          </div>
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
