import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { EditYouthDialog } from "@/components/youth/EditYouthDialog";
import { YouthSelectionView } from "@/components/home/YouthSelectionView";
import { YouthDetailView } from "@/components/home/YouthDetailView";
import { RapidPlacementAssessment } from "@/components/assessment/RapidPlacementAssessment";
import { supabase } from "@/integrations/supabase/client";
import { mapYouthFromSupabase, type Youth } from "@/types/app-types";
import { useToast } from "@/hooks/use-toast";
import { populateMockData } from "@/utils/populateMockData";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Index = () => {
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const [youths, setYouths] = useState<Youth[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [editingYouth, setEditingYouth] = useState<Youth | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [youthToDelete, setYouthToDelete] = useState<Youth | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const { toast } = useToast();

  const fetchYouths = async () => {
    try {
      setLoading(true);
      const { data: youthsData, error: youthsError } = await supabase
        .from("youths")
        .select("*")
        .order("firstname", { ascending: true });

      if (youthsError) {
        throw youthsError;
      }

      const mappedYouths = youthsData
        .map(mapYouthFromSupabase)
        .filter(youth => {
          const hasValidId = youth.id && typeof youth.id === 'string' && youth.id.trim() !== "";
          const hasValidNames = youth.firstName && youth.lastName && 
                               youth.firstName.trim() !== "" && youth.lastName.trim() !== "";
          return hasValidId && hasValidNames;
        });
        
      setYouths(mappedYouths);
    } catch (err) {
      console.error("Error fetching youths:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYouths();
  }, []);

  const handleLoadMockData = async () => {
    const success = await populateMockData();
    if (success) {
      fetchYouths();
    }
  };

  const handleYouthSelect = (youth: Youth) => {
    setSelectedYouth(youth);
  };

  const handleBackToHome = () => {
    setSelectedYouth(null);
    setActiveTab("profile");
  };

  const handleEditYouth = (youth: Youth, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingYouth(youth);
  };

  const handleDeleteYouth = (youth: Youth, event: React.MouseEvent) => {
    event.stopPropagation();
    setYouthToDelete(youth);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteYouth = async () => {
    if (!youthToDelete) return;

    try {
      const { error } = await supabase
        .from('youths')
        .delete()
        .eq('id', youthToDelete.id);

      if (error) throw error;

      toast({
        title: "Profile Deleted",
        description: `${youthToDelete.firstName} ${youthToDelete.lastName}'s profile has been removed. 🗑️`,
      });

      // If the deleted youth was selected, go back to home
      if (selectedYouth && selectedYouth.id === youthToDelete.id) {
        setSelectedYouth(null);
      }

      fetchYouths();
    } catch (error) {
      console.error("Error deleting youth profile:", error);
      toast({
        title: "Error",
        description: "Failed to delete youth profile.",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setYouthToDelete(null);
    }
  };

  const formatPoints = (points: number) => {
    return points.toLocaleString();
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Not specified";
    try {
      return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }).format(date);
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header 
        showAdmin={showAdmin}
        onAdminToggle={() => {
          setShowAdmin(!showAdmin);
          setSelectedYouth(null);
        }}
      />
      <main className="container mx-auto px-4 py-8">
        {showAdmin ? (
          <div className="space-y-6">
            <div className="flex gap-4 mb-6">
              <a 
                href="/assessment-kpi" 
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                📊 Assessment KPI Dashboard
              </a>
            </div>
            <RapidPlacementAssessment />
          </div>
        ) : !selectedYouth ? (
          <>
            <YouthSelectionView
              youths={youths}
              loading={loading}
              onYouthSelect={handleYouthSelect}
              onEditYouth={handleEditYouth}
              onDeleteYouth={handleDeleteYouth}
              formatPoints={formatPoints}
              formatDate={formatDate}
            />
            
            {/* Show Load Mock Data button only when there are no youths */}
            {!loading && youths.length === 0 && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMockData}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Load Sample Data
                </button>
                <p className="text-gray-600 text-sm mt-2">
                  Click to populate the system with sample youth profiles for testing
                </p>
              </div>
            )}
          </>
        ) : (
          <YouthDetailView
            selectedYouth={selectedYouth}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onBackToHome={handleBackToHome}
            onYouthUpdated={fetchYouths}
          />
        )}
      </main>
      
      {/* Edit Youth Dialog */}
      {editingYouth && (
        <EditYouthDialog
          youth={editingYouth}
          open={!!editingYouth}
          onClose={() => setEditingYouth(null)}
          onSuccess={() => {
            fetchYouths();
            setEditingYouth(null);
            toast({
              title: "Success",
              description: `Profile for ${editingYouth.firstName} ${editingYouth.lastName} updated successfully! ✨`,
            });
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {youthToDelete?.firstName} {youthToDelete?.lastName}'s profile and all associated data. This action cannot be undone. 😢
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              toast({
                title: "Delete Cancelled",
                description: "Delete action cancelled. Phew! 😅",
              });
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteYouth}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
