
import { Youth } from "@/types/app-types";

interface BackgroundProfileTabProps {
  youth: Youth;
}

export const BackgroundProfileTab = ({ youth }: BackgroundProfileTabProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-red-800 mb-2">Referral Information</h3>
        <div className="space-y-3">
          <div>
            <span className="font-medium text-gray-700">Referral Source:</span>
            <span className="ml-2">{youth.referralSource || "Not specified"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Referral Reason:</span>
            <div className="mt-1 p-3 bg-gray-50 rounded-md">
              {youth.referralReason || "Not specified"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
