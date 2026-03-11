import { memo } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReferralFieldRowProps {
  label: string;
  value: string | React.ReactNode;
  icon?: React.ReactNode;
  onCopySuccess?: () => void;
}

/**
 * ReferralFieldRow component for displaying a field label and value with copy button.
 * Memoized to prevent unnecessary re-renders.
 */
const ReferralFieldRow = memo(function ReferralFieldRow({
  label,
  value,
  icon,
  onCopySuccess,
}: ReferralFieldRowProps) {
  const handleCopy = async () => {
    // Convert value to string if it's not already
    const stringValue = typeof value === "string" ? value : String(value);

    try {
      await navigator.clipboard.writeText(stringValue);
      toast.success(`Copied: ${label}`);
      onCopySuccess?.();
    } catch (err) {
      toast.error("Failed to copy to clipboard");
      console.error("Copy failed:", err);
    }
  };

  return (
    <div className="flex items-start gap-2 text-sm">
      {icon && <span className="shrink-0 text-gray-500">{icon}</span>}
      <span className="font-medium text-gray-600 min-w-[120px] shrink-0">{label}:</span>
      <span className="text-gray-900 break-words flex-1">{value}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 flex-shrink-0"
        title={`Copy ${label}`}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
});

export { ReferralFieldRow };
