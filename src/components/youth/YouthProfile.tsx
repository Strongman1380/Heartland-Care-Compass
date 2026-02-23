import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Printer, LogOut, Trash2 } from "lucide-react";
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
import { format } from "date-fns";
import { Youth } from "@/integrations/firebase/services";
import { useYouth } from "@/hooks/useSupabase";
import { printYouthProfile } from "@/utils/profileExport";
import { toast } from "sonner";
import { PersonalInfoProfileTab } from "./PersonalInfoProfileTab";
import { BackgroundProfileTab } from "./BackgroundProfileTab";
import { EducationProfileTab } from "./EducationProfileTab";
import { MedicalProfileTab } from "./MedicalProfileTab";
import { MentalHealthProfileTab } from "./MentalHealthProfileTab";
import { SuccessPlan } from "@/components/planning/SuccessPlan";
import { EditYouthDialog } from "./EditYouthDialog";
import { DischargeDialog } from "./DischargeDialog";

interface YouthProfileProps {
  youth: Youth;
  onBack?: () => void;
  onYouthUpdated?: (updated?: Youth) => void;
  onRatingsUpdated?: () => void;
}

export const YouthProfile = ({ youth, onBack, onYouthUpdated }: YouthProfileProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [dischargeDialogOpen, setDischargeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { updateYouth, deleteYouth } = useYouth();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not specified";
    try {
      const date = new Date(dateString);
      return format(date, "MMMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    if (onYouthUpdated) {
      onYouthUpdated();
    }
  };

  const handleDischarge = async (data: { dischargeCategory: string; dischargeReason: string; dischargeNotes: string }) => {
    try {
      await updateYouth(youth.id, {
        status: 'discharged',
        dischargeDate: new Date().toISOString().split('T')[0],
        dischargeCategory: data.dischargeCategory,
        dischargeReason: data.dischargeReason,
        dischargeNotes: data.dischargeNotes,
      });
      setDischargeDialogOpen(false);
      toast.success(`${youth.firstName} ${youth.lastName} has been discharged.`);
      if (onYouthUpdated) onYouthUpdated();
    } catch (error) {
      console.error("Discharge error:", error);
      toast.error("Failed to discharge youth.");
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteYouth(youth.id);
      setDeleteDialogOpen(false);
      toast.success(`${youth.firstName} ${youth.lastName}'s profile has been deleted.`);
      if (onBack) onBack();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete youth profile.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrintProfile = () => {
    try {
      printYouthProfile(youth as any);
    } catch (error) {
      console.error("Error printing profile:", error);
      toast.error("Failed to open print dialog. Please allow popups.");
    }
  };

  return (
    <div>
      {onBack && (
        <Button variant="outline" onClick={onBack} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
      )}

      <Card className="border-2 border-red-300">
        <CardHeader className="bg-gradient-to-r from-red-50 via-yellow-50 to-red-50">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl text-red-800 mb-2">
                {youth.firstName} {youth.lastName}
              </CardTitle>
              <div className="text-sm text-red-600 mb-3">
                <span className="font-semibold">Youth ID:</span> 
                <span className="font-mono ml-2">{youth.id}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-red-700">
                <div>
                  <span className="font-semibold">Age:</span> {youth.age || "Not specified"}
                </div>
                <div>
                  <span className="font-semibold">Level:</span> {youth.level}
                </div>
                <div>
                  <span className="font-semibold">Points:</span> {youth.pointTotal || 0}
                </div>
                <div>
                  <span className="font-semibold">Admitted:</span> {formatDate(youth.admissionDate)}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintProfile}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDischargeDialogOpen(true)}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Discharge
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="background">Background</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="mental-health">Mental Health</TabsTrigger>
              <TabsTrigger value="service-plan">Service Plan</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <PersonalInfoProfileTab youth={youth} onYouthUpdated={onYouthUpdated} />
            </TabsContent>

            <TabsContent value="background">
              <BackgroundProfileTab youth={youth} onYouthUpdated={onYouthUpdated} />
            </TabsContent>

            <TabsContent value="education">
              <EducationProfileTab youth={youth} onYouthUpdated={onYouthUpdated} />
            </TabsContent>

            <TabsContent value="medical">
              <MedicalProfileTab youth={youth} onYouthUpdated={onYouthUpdated} />
            </TabsContent>

            <TabsContent value="mental-health">
              <MentalHealthProfileTab youth={youth} onYouthUpdated={onYouthUpdated} />
            </TabsContent>

            <TabsContent value="service-plan">
              <SuccessPlan youthId={youth.id} youth={youth} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {editDialogOpen && (
        <EditYouthDialog
          youth={youth}
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      <DischargeDialog
        youth={youth}
        open={dischargeDialogOpen}
        onClose={() => setDischargeDialogOpen(false)}
        onConfirm={handleDischarge}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Youth Profile</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{youth.firstName} {youth.lastName}</strong>'s profile and all associated data including case notes, behavior points, and assessments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete Profile"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
