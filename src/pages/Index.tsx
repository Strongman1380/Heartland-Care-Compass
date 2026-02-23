import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { EditYouthDialog } from "@/components/youth/EditYouthDialog";
import { DischargeDialog } from "@/components/youth/DischargeDialog";
import { YouthSelectionView } from "@/components/home/YouthSelectionView";
import { YouthDetailView } from "@/components/home/YouthDetailView";
import { useYouth } from "@/hooks/useSupabase";
import type { Youth } from "@/integrations/firebase/services";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";

const Index = () => {
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [editingYouth, setEditingYouth] = useState<any | null>(null);
  const [dischargeDialogOpen, setDischargeDialogOpen] = useState(false);
  const [youthToDischarge, setYouthToDischarge] = useState<Youth | null>(null);
  const { toast: uiToast } = useToast();

  const { youths, loading, loadYouths, dischargeYouth } = useYouth();

  useEffect(() => {
    loadYouths();
  }, []);

  // Refresh selected youth data when youths are updated
  useEffect(() => {
    if (selectedYouth && youths.length > 0) {
      const updatedYouth = youths.find(y => y.id === selectedYouth.id);
      if (updatedYouth) {
        setSelectedYouth(updatedYouth as any);
      }
    }
  }, [youths, selectedYouth?.id]);


  const handleYouthSelect = (youth: Youth) => {
    console.log('Youth selected:', youth);
    setSelectedYouth(youth);
    setActiveTab("profile"); // Reset to profile tab when selecting a youth
  };

  const handleBackToHome = () => {
    console.log('Back to home');
    setSelectedYouth(null);
    setActiveTab("profile");
  };

  const handleEditYouth = (youth: Youth, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingYouth(youth);
  };

  const handleDischargeYouth = (youth: Youth, event: React.MouseEvent) => {
    event.stopPropagation();
    setYouthToDischarge(youth);
    setDischargeDialogOpen(true);
  };

  const confirmDischargeYouth = async (data: {
    dischargeCategory: string;
    dischargeReason: string;
    dischargeNotes: string;
  }) => {
    if (!youthToDischarge) return;

    try {
      await dischargeYouth(youthToDischarge.id, data);

      if (selectedYouth && selectedYouth.id === youthToDischarge.id) {
        setSelectedYouth(null);
      }

      toast.success(`${youthToDischarge.firstName} ${youthToDischarge.lastName} has been discharged.`);
    } catch (error) {
      console.error("Error discharging youth:", error);
      toast.error("Failed to discharge youth.");
    } finally {
      setDischargeDialogOpen(false);
      setYouthToDischarge(null);
    }
  };

  const formatPoints = (points: number) => {
    return points.toLocaleString();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not specified";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }).format(date);
    } catch {
      return "Invalid date";
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('Index state:', { selectedYouth: selectedYouth?.firstName, activeTab, youthsCount: youths.length });
  }, [selectedYouth, activeTab, youths.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {!selectedYouth ? (
          <>
            <YouthSelectionView
              youths={youths}
              loading={loading}
              onYouthSelect={handleYouthSelect}
              onEditYouth={handleEditYouth}
              onDischargeYouth={handleDischargeYouth}
              formatPoints={formatPoints}
              formatDate={formatDate}
            />
          </>
        ) : selectedYouth && selectedYouth.id ? (
          <YouthDetailView
            selectedYouth={selectedYouth}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onBackToHome={handleBackToHome}
            onYouthUpdated={(updated?) => {
              if (updated) setSelectedYouth(updated);
              loadYouths();
            }}
          />
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-lg">
            <p className="text-red-600 text-lg font-semibold mb-2">Error: Invalid youth profile</p>
            <p className="text-gray-600 mb-4">The selected youth profile could not be loaded.</p>
            <button
              onClick={handleBackToHome}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Youth List
            </button>
          </div>
        )}
      </main>
      
      {/* Edit Youth Dialog */}
      {editingYouth && (
        <EditYouthDialog
          youth={editingYouth}
          open={!!editingYouth}
          onClose={() => setEditingYouth(null)}
          onSuccess={() => {
            loadYouths();
            setEditingYouth(null);
            uiToast({
              title: "Success",
              description: `Profile for ${editingYouth.firstName} ${editingYouth.lastName} updated successfully! ✨`,
            });
          }}
        />
      )}

      {/* Discharge Dialog */}
      <DischargeDialog
        youth={youthToDischarge}
        open={dischargeDialogOpen}
        onClose={() => {
          setDischargeDialogOpen(false);
          setYouthToDischarge(null);
        }}
        onConfirm={confirmDischargeYouth}
      />

      <footer className="heartland-gradient py-6 text-center text-yellow-100 text-sm mt-12">
        <div className="container mx-auto px-4">
          <p className="font-medium">Heartland Boys Home Platform &copy; {new Date().getFullYear()}</p>
          <p className="text-yellow-200 text-xs mt-1">Empowering Youth Through Structure and Support</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
