
import { Youth } from "@/types/app-types";

interface MentalHealthProfileTabProps {
  youth: Youth;
}

export const MentalHealthProfileTab = ({ youth }: MentalHealthProfileTabProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-red-800 mb-2">Mental Health Information</h3>
        <div className="p-3 bg-gray-50 rounded-md">
          {youth.mentalHealthInfo || "No mental health information available"}
        </div>
      </div>
    </div>
  );
};
