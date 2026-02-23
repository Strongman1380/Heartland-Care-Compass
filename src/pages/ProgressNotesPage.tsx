
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ProgressNotes } from "@/components/notes/ProgressNotes";
import { YouthSelector } from "@/components/common/YouthSelector";

const ProgressNotesPage = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string | undefined>(undefined);

  const handleYouthSelect = (youthId: string) => {
    setSelectedYouthId(youthId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Case Notes
          </h1>
          <p className="text-red-700 text-base sm:text-lg">Document and track youth progress and observations</p>
        </div>
        
        {!selectedYouthId ? (
          <YouthSelector 
            onSelectYouth={handleYouthSelect}
            selectedYouthId={selectedYouthId}
          />
        ) : (
          <ProgressNotes youthId={selectedYouthId} youth={null} />
        )}
      </main>
    </div>
  );
};

export default ProgressNotesPage;
