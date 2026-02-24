
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ProgressNotes } from "@/components/notes/ProgressNotes";
import { YouthSelector } from "@/components/common/YouthSelector";
import { GroupNotePanel } from "@/components/notes/GroupNotePanel";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

type PageMode = "select" | "individual" | "group";

const ProgressNotesPage = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<PageMode>("select");

  const handleYouthSelect = (youthId: string) => {
    setSelectedYouthId(youthId);
    setMode("individual");
  };

  const handleGroupNote = () => {
    setMode("group");
  };

  const handleBack = () => {
    setSelectedYouthId(undefined);
    setMode("select");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Case Notes
          </h1>
          <p className="text-red-700 text-base sm:text-lg">Document and track youth progress and observations</p>
        </div>

        {mode === "select" && (
          <>
            <div className="flex justify-end mb-4">
              <Button onClick={handleGroupNote} variant="outline">
                <Users size={16} className="mr-2" />
                Group Note
              </Button>
            </div>
            <YouthSelector
              onSelectYouth={handleYouthSelect}
              selectedYouthId={selectedYouthId}
            />
          </>
        )}

        {mode === "individual" && selectedYouthId && (
          <ProgressNotes youthId={selectedYouthId} youth={null} />
        )}

        {mode === "group" && (
          <GroupNotePanel onBack={handleBack} />
        )}
      </main>
    </div>
  );
};

export default ProgressNotesPage;
