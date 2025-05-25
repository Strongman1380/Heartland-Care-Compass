
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { YouthProfile } from "@/components/youth/YouthProfile";
import { BehaviorCard } from "@/components/behavior/BehaviorCard";
import { ProgressNotes } from "@/components/notes/ProgressNotes";
import { BehaviorAnalysis } from "@/components/analysis/BehaviorAnalysis";
import { RiskAssessment } from "@/components/assessment/RiskAssessment";
import { ReportCenter } from "@/components/reports/ReportCenter";
import { EditYouthDialog } from "@/components/youth/EditYouthDialog";
import { User, CheckSquare, FileText, BarChart2, Shield, FileChartPie, Users, ArrowLeft, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mapYouthFromSupabase, type Youth } from "@/types/app-types";
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

const Index = () => {
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const [youths, setYouths] = useState<Youth[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [editingYouth, setEditingYouth] = useState<Youth | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [youthToDelete, setYouthToDelete] = useState<Youth | null>(null);
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

  // Show youth selection view
  if (!selectedYouth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg border-2 border-yellow-300 p-6 mb-8">
            <div className="text-center">
              <img 
                src="/lovable-uploads/983078ec-ca85-495c-8d9a-65acb6523081.png" 
                alt="Heartland Boys Home Logo" 
                className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-100 to-yellow-100 p-2"
              />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
                Welcome to the Heartland Boys Home Platform
              </h1>
              <p className="text-red-600 text-lg mb-6">
                Select a youth from the profiles below to manage their information and track their progress.
              </p>
              <div className="p-4 bg-gradient-to-r from-red-100 to-yellow-100 rounded-lg border border-yellow-300">
                <p className="text-red-700 font-medium">Building character, one day at a time.</p>
              </div>
            </div>
          </div>

          {/* Youth Profiles Grid */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-red-800 mb-4 text-center">Youth Profiles</h2>
            
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                <span className="ml-4 text-red-700">Loading youth profiles...</span>
              </div>
            ) : youths.length === 0 ? (
              <Card className="border-2 border-yellow-300">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <Users className="h-16 w-16 text-red-600" />
                  </div>
                  <CardTitle className="text-2xl text-red-800">No Youth Profiles Found</CardTitle>
                  <CardDescription className="text-red-600 text-lg">
                    There are currently no youth profiles in the system.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-red-700 mb-4">
                    Use the "Add New Youth" button in the header to create the first youth profile.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {youths.map((youth) => (
                  <Card 
                    key={youth.id} 
                    className="border-2 border-yellow-300 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 relative group"
                    onClick={() => handleYouthSelect(youth)}
                  >
                    <CardHeader className="text-center pb-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <User className="h-8 w-8 text-red-600" />
                      </div>
                      <CardTitle className="text-lg text-red-800">
                        {youth.firstName} {youth.lastName}
                      </CardTitle>
                      
                      {/* Action buttons - positioned absolutely in top right */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 bg-white/80 hover:bg-yellow-100 border border-yellow-300"
                          onClick={(e) => handleEditYouth(youth, e)}
                          title={`Edit ${youth.firstName}'s Profile`}
                        >
                          <Edit className="h-4 w-4 text-amber-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 bg-white/80 hover:bg-red-100 border border-red-300"
                          onClick={(e) => handleDeleteYouth(youth, e)}
                          title={`Delete ${youth.firstName}'s Profile`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Age:</span>
                          <span className="font-medium">{youth.age || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Level:</span>
                          <span className="font-medium">Level {youth.level}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Points:</span>
                          <span className="font-medium">{formatPoints(youth.pointTotal || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Admission:</span>
                          <span className="font-medium">{formatDate(youth.admissionDate)}</span>
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleYouthSelect(youth);
                        }}
                      >
                        View Profile
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
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
  }

  // Show detailed youth view with tabs
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="outline" 
              onClick={handleBackToHome}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Youth List
            </Button>
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent">
                {selectedYouth.firstName} {selectedYouth.lastName}
              </h1>
              <p className="text-red-600">Level {selectedYouth.level} • {selectedYouth.pointTotal || 0} Points</p>
            </div>
            <div className="w-32"></div> {/* Spacer for layout balance */}
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 shadow-lg rounded-lg overflow-x-auto flex w-full justify-start md:justify-center border-2 border-yellow-300">
            <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
              <User size={16} />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="behavior" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
              <CheckSquare size={16} />
              <span>Daily Points</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
              <FileText size={16} />
              <span>Progress Notes</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
              <BarChart2 size={16} />
              <span>Behavior Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="assessment" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
              <Shield size={16} />
              <span>Risk Assessment</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
              <FileChartPie size={16} />
              <span>Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <YouthProfile 
              youth={selectedYouth} 
              onBack={handleBackToHome}
              onYouthUpdated={fetchYouths}
            />
          </TabsContent>
          
          <TabsContent value="behavior">
            <BehaviorCard youthId={selectedYouth.id} youth={selectedYouth} />
          </TabsContent>
          
          <TabsContent value="notes">
            <ProgressNotes youthId={selectedYouth.id} youth={selectedYouth} />
          </TabsContent>
          
          <TabsContent value="analysis">
            <BehaviorAnalysis youthId={selectedYouth.id} youth={selectedYouth} />
          </TabsContent>
          
          <TabsContent value="assessment">
            <RiskAssessment youthId={selectedYouth.id} youth={selectedYouth} />
          </TabsContent>
          
          <TabsContent value="reports">
            <ReportCenter youthId={selectedYouth.id} youth={selectedYouth} />
          </TabsContent>
        </Tabs>
      </main>
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
