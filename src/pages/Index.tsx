import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { EditYouthDialog } from "@/components/youth/EditYouthDialog";
import { YouthSelectionView } from "@/components/home/YouthSelectionView";
import { YouthDetailView } from "@/components/home/YouthDetailView";
import { useYouth } from "@/hooks/useSupabase";
import type { Youth } from "@/integrations/supabase/services";
import { useToast } from "@/hooks/use-toast";
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
import { toast } from "sonner";

const Index = () => {
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [editingYouth, setEditingYouth] = useState<any | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [youthToDelete, setYouthToDelete] = useState<any | null>(null);
  // Remove admin state - no longer needed
  const { toast: uiToast } = useToast();
  
  // Use Supabase hook for youth operations
  const { youths, loading, loadYouths, deleteYouth: deleteYouthFromSupabase } = useYouth();

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

  const handleDeleteYouth = (youth: Youth, event: React.MouseEvent) => {
    event.stopPropagation();
    setYouthToDelete(youth);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteYouth = async () => {
    if (!youthToDelete) return;

    try {
      await deleteYouthFromSupabase(youthToDelete.id);

      // If the deleted youth was selected, go back to home
      if (selectedYouth && selectedYouth.id === youthToDelete.id) {
        setSelectedYouth(null);
      }

      toast.success(`${youthToDelete.firstName} ${youthToDelete.lastName}'s profile has been removed. 🗑️`);
    } catch (error) {
      console.error("Error deleting youth profile:", error);
      toast.error("Failed to delete youth profile.");
    } finally {
      setDeleteConfirmOpen(false);
      setYouthToDelete(null);
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
              onDeleteYouth={handleDeleteYouth}
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
            onYouthUpdated={loadYouths}
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
              uiToast({
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
