
import { Youth } from "@/types/app-types";

interface EducationProfileTabProps {
  youth: Youth;
}

export const EducationProfileTab = ({ youth }: EducationProfileTabProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-red-800 mb-2">Education Information</h3>
        <div className="p-3 bg-gray-50 rounded-md">
          {youth.educationInfo || "No education information available"}
        </div>
      </div>
    </div>
  );
};
