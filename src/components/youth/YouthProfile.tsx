import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Printer, LogOut, Archive } from "lucide-react";
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
import { ColorAssessment } from "@/components/assessment/ColorAssessment";
import { RiskAssessment } from "@/components/assessment/RiskAssessment";
import { EditYouthDialog } from "./EditYouthDialog";
import { DischargeDialog } from "./DischargeDialog";
import { MonthlyShiftAverage } from "./MonthlyShiftAverage";
import { RecentIncidentsAlert } from "./RecentIncidentsAlert";
import { TopSuccessPlanGoals } from "./TopSuccessPlanGoals";
import { UpcomingImportantDates } from "./UpcomingImportantDates";
import { ContactsQuickReference } from "./ContactsQuickReference";
import { useAwards } from "@/contexts/AwardsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBehaviorPointSummary } from "@/hooks/useBehaviorPointSummary";

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
  const [isArchiving, setIsArchiving] = useState(false);
  const { updateYouth, archiveYouth } = useYouth();
  const { user, isAdmin } = useAuth();
  const { todayTotal, weekTotal, monthTotal, lifetimeTotal } = useBehaviorPointSummary(youth.id);

  // Use shared awards context — no per-component recalculation
  const { awards: awardData, loading: loadingAwards } = useAwards();

  const colors = useMemo(() => {
    const VALID = new Set(["HEART", "ANCHOR", "MIND", "SPARK"]);
    const raw = youth.realColorsResult;
    if (!raw) return [];
    const tokens = Array.isArray(raw)
      ? raw.map((v) => v.trim().toUpperCase())
      : typeof raw === "string"
        ? raw.split(/[,/&|\s]+/).map((v) => v.trim().toUpperCase())
        : [];
    return tokens
      .filter((v) => VALID.has(v))
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 2);
  }, [youth.realColorsResult]);

  const youthAwards = useMemo(() => {
    if (!awardData) return [];
    const items: string[] = [];
    if (awardData.residentOfWeek?.youthId === youth.id) items.push("Resident of the Week");
    if (awardData.residentOfMonth?.youthId === youth.id) items.push("Resident of the Month");
    if (awardData.mostImprovedWeek?.youthId === youth.id) items.push("Most Improved Resident");
    return items;
  }, [awardData, youth.id]);

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

  const handleArchive = async () => {
    try {
      setIsArchiving(true);
      await archiveYouth(youth.id, user?.email ?? "unknown");
      setDeleteDialogOpen(false);
      toast.success(`${youth.firstName} ${youth.lastName}'s profile has been archived. Contact an admin to restore.`);
      if (onBack) onBack();
    } catch (error) {
      console.error("Archive error:", error);
      toast.error("Failed to archive youth profile.");
    } finally {
      setIsArchiving(false);
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
              {(colors.length > 0 || youthAwards.length > 0 || loadingAwards) && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {colors.map((color) => (
                    <Badge key={color} variant="secondary" className="bg-white/80 dark:bg-slate-800/80 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300">
                      {color}
                    </Badge>
                  ))}
                  {loadingAwards && (
                    <Badge variant="outline" className="bg-white/70 dark:bg-slate-800/70 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300">
                      Calculating awards...
                    </Badge>
                  )}
                  {!loadingAwards &&
                    youthAwards.map((award) => (
                      <Badge key={award} className="bg-yellow-500 hover:bg-yellow-500 text-black border border-yellow-600">
                        {award}
                      </Badge>
                    ))}
                </div>
              )}
              <div className="text-sm text-red-600 mb-3">
                <span className="font-semibold">Youth ID:</span> 
                <span className="font-mono ml-2">{youth.id}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-red-700">
                <div>
                  <span className="font-semibold">Age:</span> {youth.age || "Not specified"}
                </div>
                <div>
                  <span className="font-semibold">Level:</span> {youth.level}
                </div>
                <div>
                  <span className="font-semibold">Today's Points:</span> {todayTotal.toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold">Last 7 Days:</span> {weekTotal.toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold">Month Total:</span> {monthTotal.toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold">Admitted:</span> {formatDate(youth.admissionDate)}
                </div>
              </div>
              <div className="mt-3 text-sm text-red-700">
                <span className="font-semibold">Lifetime Total:</span> {lifetimeTotal.toLocaleString()}
              </div>
              <MonthlyShiftAverage youthId={youth.id} />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintProfile}
                className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDischargeDialogOpen(true)}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Discharge
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-9">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="background">Background</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="mental-health">Mental Health</TabsTrigger>
              <TabsTrigger value="personality">Personality</TabsTrigger>
              <TabsTrigger value="service-plan">Service Plan</TabsTrigger>
              <TabsTrigger value="hyrna">HYRNA</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <RecentIncidentsAlert youthId={youth.id} youthName={`${youth.firstName} ${youth.lastName}`} />
                <TopSuccessPlanGoals youth={youth} />
                <UpcomingImportantDates youth={youth} />
                <ContactsQuickReference youth={youth} />
              </div>
            </TabsContent>

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

            <TabsContent value="personality">
              <ColorAssessment selectedYouth={youth} onSaved={onYouthUpdated} />
            </TabsContent>

            <TabsContent value="service-plan">
              <SuccessPlan youthId={youth.id} youth={youth} />
            </TabsContent>

            <TabsContent value="hyrna">
              <RiskAssessment youthId={youth.id} youth={youth} />
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
            <AlertDialogTitle>Archive Youth Profile</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive <strong>{youth.firstName} {youth.lastName}</strong>'s profile, removing them from the active youth list. Their data will be preserved and an admin can restore the profile if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isArchiving ? "Archiving..." : "Archive Profile"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
