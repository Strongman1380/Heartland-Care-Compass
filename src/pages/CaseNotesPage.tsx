import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { EnhancedCaseNotes } from "@/components/notes/EnhancedCaseNotes";
import { YouthSelector } from "@/components/common/YouthSelector";

const CaseNotesPage = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string | undefined>(undefined);

  const handleYouthSelect = (youthId: string) => {
    setSelectedYouthId(youthId);
  };

  const handleBackToSelection = () => {
    setSelectedYouthId(undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Case Notes
          </h1>
          <p className="text-red-700 text-lg">Document case notes for reports and record keeping</p>
        </div>
        
        {!selectedYouthId ? (
          <YouthSelector
            onSelectYouth={handleYouthSelect}
            selectedYouthId={selectedYouthId}
          />
        ) : (
          <EnhancedCaseNotes
            youthId={selectedYouthId}
            youth={null}
            onYouthChange={handleYouthSelect}
            onBackToSelection={handleBackToSelection}
          />
        )}
      </main>
    </div>
  );
};

export default CaseNotesPage;