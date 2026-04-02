import { memo, ReactNode, useState } from "react";
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
 * ReferralSectionCard — collapsible section with a bold header stripe,
 * accent left-border colour, and smooth open/close animation.
 */
const ReferralSectionCard = memo(function ReferralSectionCard({
  title,
  icon: Icon,
  fieldCount,
  completionPercentage,
  defaultOpen = true,
  borderColor = "border-gray-200",
  backgroundColor = "bg-white",
  children,
  onOpenChange,
}: ReferralSectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    onOpenChange?.(next);
  };

  // Derive a subtle left-accent colour from the borderColor prop
  // borderColor is typically "border border-amber-200" etc. – extract the colour class
  const accentMatch = borderColor.match(/border-([a-z]+-\d+)/);
  const accentClass = accentMatch ? `border-l-4 border-l-${accentMatch[1]}` : "border-l-4 border-l-gray-200";

  return (
    <div className={`rounded-lg border ${borderColor} ${backgroundColor} ${accentClass} overflow-hidden shadow-sm`}>
      {/* Header */}
      <button
        onClick={toggle}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-black/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-gray-500 shrink-0" />
          <span className="text-sm font-semibold text-gray-800 tracking-tight">{title}</span>
          <span className="text-xs text-gray-400 font-normal">
            {fieldCount} {fieldCount === 1 ? "field" : "fields"}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <DataDensityBadge
            completed={Math.round((fieldCount * completionPercentage) / 100)}
            total={fieldCount}
            showPercentage={false}
            showProgressBar={true}
          />
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Content */}
      {open && (
        <div className="border-t border-gray-100 px-3 py-2">
          {children}
        </div>
      )}
    </div>
  );
});

export { ReferralSectionCard };
