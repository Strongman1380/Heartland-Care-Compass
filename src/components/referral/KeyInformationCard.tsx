import { memo } from "react";
import { AlertTriangle, Star } from "lucide-react";
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
 * KeyInformationCard — pinned summary of the most critical referral fields.
 * Rendered before the section cards, always expanded.
 */
const KeyInformationCard = memo(function KeyInformationCard({
  parsedData,
}: KeyInformationCardProps) {
  const keyFields = getKeyInformationFields(parsedData);
  if (keyFields.length === 0) return null;

  const criticalFields = ["Name", "DOB", "Age", "Sex", "Referral Source"];
  const missingCritical = criticalFields.filter(
    (field) => !keyFields.find((f) => f.label === field && f.value)
  );

  return (
    <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-slate-50 shadow-sm overflow-hidden">
      {/* Header stripe */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-blue-100 bg-blue-50/80">
        <div className="flex items-center gap-2">
          <Star className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-blue-700">
            Key Information
          </span>
        </div>
        {missingCritical.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <AlertTriangle className="h-3 w-3" />
            Missing: {missingCritical.join(", ")}
          </div>
        )}
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-0 divide-x divide-y divide-blue-100/60">
        {keyFields.map(({ label, value }) => (
          <ReferralFieldRow key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
});

export { KeyInformationCard };
