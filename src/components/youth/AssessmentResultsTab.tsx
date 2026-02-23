import { Youth } from "@/integrations/firebase/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, User } from "lucide-react";

interface AssessmentResultsTabProps {
  youth: Youth;
  onYouthUpdated?: (updated?: Youth) => void;
}

export const AssessmentResultsTab = ({ youth, onYouthUpdated }: AssessmentResultsTabProps) => {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg text-primary flex items-center gap-2">
            <User className="h-5 w-5" />
            Youth Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Assessment Information</p>
            <p className="text-sm">
              Youth assessment data is managed through the edit profile functionality.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
