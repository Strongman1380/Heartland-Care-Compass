import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { EditYouthDialog } from "@/components/youth/EditYouthDialog";
import { YouthSelectionView } from "@/components/home/YouthSelectionView";
import { YouthDetailView } from "@/components/home/YouthDetailView";
import { RapidPlacementAssessment } from "@/components/assessment/RapidPlacementAssessment";
import { type Youth } from "@/types/app-types";
import { useToast } from "@/hooks/use-toast";
import { mongoClient } from "@/utils/mongoClient";
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
      
      // Fetch from MongoDB API
      const data = await mongoClient.getYouths();

      // Convert MongoDB data to Youth type
      const youthsData: Youth[] = (data || []).map((youth: any) => ({
        id: youth._id,
        firstName: youth.firstName,
        lastName: youth.lastName,
        age: youth.age || 0,
        dob: youth.dob ? new Date(youth.dob) : null,
        admissionDate: youth.admissionDate ? new Date(youth.admissionDate) : null,
        level: youth.level || 1,
        pointTotal: youth.pointTotal || 0,
        referralSource: youth.referralSource || '',
        referralReason: youth.referralReason || '',
        legalStatus: youth.legalStatus || '',
        educationInfo: youth.educationInfo || '',
        medicalInfo: youth.medicalInfo || '',
        mentalHealthInfo: youth.mentalHealthInfo || '',
        peerInteraction: youth.peerInteraction || 3,
        adultInteraction: youth.adultInteraction || 3,
        investmentLevel: youth.investmentLevel || 3,
        dealAuthority: youth.dealAuthority || 2,
        hyrnaRiskLevel: youth.hyrnaRiskLevel || "Medium",
        hyrnaScore: youth.hyrnaScore || 50,
        hyrnaAssessmentDate: youth.hyrnaAssessmentDate ? new Date(youth.hyrnaAssessmentDate) : new Date(),
        createdAt: youth.createdAt ? new Date(youth.createdAt) : new Date(),
        updatedAt: youth.updatedAt ? new Date(youth.updatedAt) : new Date()
      }));
      
      setYouths(youthsData);
    } catch (err) {
      console.error("Error loading youths:", err);
      toast({
        title: "Error",
        description: "Failed to load youth data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYouths();
  }, []);

  const handleLoadMockData = async () => {
    try {
      setLoading(true);
      const success = await populateMockData();
      if (success) {
        await fetchYouths(); // Reload data from database
        toast({
          title: "Sample data populated",
          description: "Sample youth data has been added to the database successfully"
        });
      }
    } catch (error) {
      console.error("Error loading mock data:", error);
      toast({
        title: "Error",
        description: "Failed to populate sample data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllData = async () => {
    try {
      setLoading(true);
      
      // Clear all data from MongoDB
      const result = await mongoClient.clearAllData();
      console.log("Data cleared:", result.message);

      setYouths([]);
      toast({
        title: "All data cleared",
        description: "All youth data has been removed from the database"
      });
    } catch (error) {
      console.error("Error clearing data:", error);
      toast({
        title: "Error",
        description: "Failed to clear data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
      // Delete from MongoDB
      await mongoClient.deleteYouth(youthToDelete.id);

      // Remove from local state
      setYouths(prevYouths => prevYouths.filter(youth => youth.id !== youthToDelete.id));
      
      toast({
        title: "Profile Deleted",
        description: `${youthToDelete.firstName} ${youthToDelete.lastName}'s profile has been removed. 🗑️`,
      });
      
      setDeleteConfirmOpen(false);
      setYouthToDelete(null);
    } catch (error) {
      console.error("Error deleting youth:", error);
      toast({
        title: "Error",
        description: "Failed to delete youth profile",
        variant: "destructive"
      });
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
            
            {/* Show data management buttons */}
            {!loading && (
              <div className="text-center mt-8">
                {youths.length === 0 ? (
                  <div>
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
                ) : (
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={handleLoadMockData}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Add More Sample Data
                    </button>
                    <button
                      onClick={handleClearAllData}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Clear All Data
                    </button>
                  </div>
                )}
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
