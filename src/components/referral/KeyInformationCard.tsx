import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { ReferralFieldRow } from "./ReferralFieldRow";
import { getKeyInformationFields } from "@/utils/referralUtils";
import { type ParsedReferral } from "@/utils/referralParser";

interface ReferralHistoryItem {
  id: string;
  createdAt: string;
  parsedData: ParsedReferral | null;
  [key: string]: any;
}

interface KeyInformationCardProps {
  parsedData: ParsedReferral | null;
  item?: ReferralHistoryItem;
}

/**
 * KeyInformationCard component for displaying critical referral assessment data.
 * Shows key fields in a 2-column grid layout with copy buttons and missing field warnings.
 * Always visible and always expanded.
 * Memoized to prevent unnecessary re-renders.
 */
const KeyInformationCard = memo(function KeyInformationCard({
  parsedData,
  item,
}: KeyInformationCardProps) {
  const keyFields = getKeyInformationFields(parsedData);

  if (keyFields.length === 0) {
    return null;
  }

  // Check for missing critical fields
  const criticalFields = ["Name", "DOB", "Age", "Sex", "Referral Source"];
  const missingCritical = criticalFields.filter(
    (field) => !keyFields.find((f) => f.label === field && f.value)
  );

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Key Information
          {missingCritical.length > 0 && (
            <AlertTriangle className="h-4 w-4 text-yellow-600" title={`Missing: ${missingCritical.join(", ")}`} />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {keyFields.map(({ label, value }) => (
            <ReferralFieldRow key={label} label={label} value={value} />
          ))}
        </div>
        {missingCritical.length > 0 && (
          <div className="mt-3 p-2 rounded bg-yellow-50 border border-yellow-200">
            <p className="text-xs text-yellow-800">
              Missing critical fields: {missingCritical.join(", ")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export { KeyInformationCard };
