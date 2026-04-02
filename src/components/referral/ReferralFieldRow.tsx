import { memo } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface ReferralFieldRowProps {
  label: string;
  value: string | React.ReactNode;
  icon?: React.ReactNode;
  onCopySuccess?: () => void;
}

/**
 * ReferralFieldRow — clean label-above-value layout with hover copy action.
 * Label renders as a small uppercase tag; value sits beneath with full weight.
 */
const ReferralFieldRow = memo(function ReferralFieldRow({
  label,
  value,
  icon,
  onCopySuccess,
}: ReferralFieldRowProps) {
  const stringValue = typeof value === "string" ? value : String(value);
  const isLong = typeof value === "string" && value.length > 100;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(stringValue);
      toast.success(`Copied "${label}"`);
      onCopySuccess?.();
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="group relative flex flex-col gap-0.5 py-2 px-2.5 rounded-md hover:bg-gray-50 transition-colors">
      {/* Label row */}
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 leading-none">
          {label}
        </span>
      </div>

      {/* Value */}
      {isLong ? (
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap pr-6">
          {value}
        </p>
      ) : (
        <span className="text-sm font-medium text-gray-900 leading-snug pr-6">
          {value}
        </span>
      )}

      {/* Copy button — appears on hover */}
      <button
        onClick={handleCopy}
        title={`Copy ${label}`}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  );
});

export { ReferralFieldRow };
