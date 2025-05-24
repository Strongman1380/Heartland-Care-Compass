
import { Header } from "@/components/layout/Header";
import { ReportCenter } from "@/components/reports/ReportCenter";
import { YouthSelector } from "@/components/common/YouthSelector";
import { useState } from "react";

const Reports = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Reports Center
          </h1>
          <p className="text-red-700 text-lg">Generate comprehensive reports and documentation</p>
        </div>
        
        <div className="mb-6">
          <YouthSelector onSelectYouth={setSelectedYouthId} />
        </div>
        
        {selectedYouthId ? (
          <ReportCenter youthId={selectedYouthId} youth={{ id: selectedYouthId }} />
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-lg text-center border-2 border-yellow-300">
            <h2 className="text-2xl font-bold text-red-800 mb-4">Select a Youth</h2>
            <p className="text-red-600 text-lg">Please select a youth from the dropdown above to generate reports.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;
