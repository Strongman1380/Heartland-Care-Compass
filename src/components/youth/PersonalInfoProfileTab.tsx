
import { Youth } from "@/types/app-types";
import { format } from "date-fns";

interface PersonalInfoProfileTabProps {
  youth: Youth;
}

export const PersonalInfoProfileTab = ({ youth }: PersonalInfoProfileTabProps) => {
  const formatDate = (date: Date | null) => {
    if (!date) return "Not specified";
    try {
      return format(date, "MMMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-red-800 mb-2">Basic Information</h3>
          <div className="space-y-2">
            <div>
              <span className="font-medium text-gray-700">First Name:</span>
              <span className="ml-2">{youth.firstName}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Last Name:</span>
              <span className="ml-2">{youth.lastName}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Date of Birth:</span>
              <span className="ml-2">{formatDate(youth.dob)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Age:</span>
              <span className="ml-2">{youth.age || "Not specified"}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-red-800 mb-2">Placement Information</h3>
          <div className="space-y-2">
            <div>
              <span className="font-medium text-gray-700">Admission Date:</span>
              <span className="ml-2">{formatDate(youth.admissionDate)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Current Level:</span>
              <span className="ml-2">Level {youth.level}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Point Total:</span>
              <span className="ml-2">{youth.pointTotal}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Legal Status:</span>
              <span className="ml-2">{youth.legalStatus || "Not specified"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
