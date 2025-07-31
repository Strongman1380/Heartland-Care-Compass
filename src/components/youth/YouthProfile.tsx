
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit } from "lucide-react";
import { format } from "date-fns";
import { Youth } from "@/types/app-types";
import { PersonalInfoProfileTab } from "./PersonalInfoProfileTab";
import { BackgroundProfileTab } from "./BackgroundProfileTab";
import { EducationProfileTab } from "./EducationProfileTab";
import { MedicalProfileTab } from "./MedicalProfileTab";
import { MentalHealthProfileTab } from "./MentalHealthProfileTab";
import { RatingsProfileTab } from "./RatingsProfileTab";
import { DailyRatingsTab } from "./DailyRatingsTab";
import { ConsolidatedScoringTab } from "./ConsolidatedScoringTab";
import { ProgressEvaluationReport } from "../reports/ProgressEvaluationReport";
import { EditYouthDialog } from "./EditYouthDialog";

interface YouthProfileProps {
  youth: Youth;
  onBack?: () => void;
  onYouthUpdated?: () => void;
}

export const YouthProfile = ({ youth, onBack, onYouthUpdated }: YouthProfileProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return "Not specified";
    try {
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
              className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue="scoring" className="space-y-6">
            <TabsList className="grid w-full grid-cols-9">
              <TabsTrigger value="scoring" className="bg-primary/10 text-primary font-medium">Quick Scoring</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="background">Background</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="mental-health">Mental Health</TabsTrigger>
              <TabsTrigger value="ratings">Ratings</TabsTrigger>
              <TabsTrigger value="daily-ratings">Daily Scoring</TabsTrigger>
              <TabsTrigger value="progress-reports">Progress Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="scoring">
              <ConsolidatedScoringTab youth={youth} />
            </TabsContent>

            <TabsContent value="personal">
              <PersonalInfoProfileTab youth={youth} />
            </TabsContent>

            <TabsContent value="background">
              <BackgroundProfileTab youth={youth} />
            </TabsContent>

            <TabsContent value="education">
              <EducationProfileTab youth={youth} />
            </TabsContent>

            <TabsContent value="medical">
              <MedicalProfileTab youth={youth} />
            </TabsContent>

            <TabsContent value="mental-health">
              <MentalHealthProfileTab youth={youth} />
            </TabsContent>

            <TabsContent value="ratings">
              <RatingsProfileTab youth={youth} />
            </TabsContent>

            <TabsContent value="daily-ratings">
              <DailyRatingsTab youth={youth} />
            </TabsContent>

            <TabsContent value="progress-reports">
              <ProgressEvaluationReport youth={youth} />
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
    </div>
  );
};
