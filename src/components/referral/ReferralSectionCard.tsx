import { memo, ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import { DataDensityBadge } from "./DataDensityBadge";

interface ReferralSectionCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  fieldCount: number;
  completionPercentage: number;
  defaultOpen?: boolean;
  borderColor?: string;
  backgroundColor?: string;
  gridColumns?: "single" | "auto";
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
}

/**
 * ReferralSectionCard component for collapsible referral data sections.
 * Wraps content in a collapsible component with header, icon, title, and data density badge.
 * Memoized to prevent unnecessary re-renders.
 */
const ReferralSectionCard = memo(function ReferralSectionCard({
  title,
  icon: Icon,
  fieldCount,
  completionPercentage,
  defaultOpen = true,
  borderColor = "border-gray-200",
  backgroundColor = "bg-white",
  gridColumns = "auto",
  children,
  onOpenChange,
}: ReferralSectionCardProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} onOpenChange={onOpenChange} className="w-full">
      <div className={`rounded-md border ${borderColor} ${backgroundColor} p-3`}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full hover:bg-gray-50/50 -m-3 p-3 rounded-md transition-colors">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-gray-700" />
              <span className="text-sm font-semibold text-gray-900">{title}</span>
              <Badge variant="outline" className="text-xs">
                {fieldCount} {fieldCount === 1 ? "field" : "fields"}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <DataDensityBadge
                completed={Math.round((fieldCount * completionPercentage) / 100)}
                total={fieldCount}
                showPercentage={false}
                showProgressBar={true}
              />
              <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-3 animate-accordion-down data-[state=closed]:animate-accordion-up">
          {children}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});

export { ReferralSectionCard };
