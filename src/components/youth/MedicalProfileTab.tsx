
import { Youth } from "@/types/app-types";

interface MedicalProfileTabProps {
  youth: Youth;
}

export const MedicalProfileTab = ({ youth }: MedicalProfileTabProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-red-800 mb-2">Medical Information</h3>
        <div className="p-3 bg-gray-50 rounded-md">
          {youth.medicalInfo || "No medical information available"}
        </div>
      </div>
    </div>
  );
};
