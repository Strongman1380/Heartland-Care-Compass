import * as React from "react";

import { cn } from "@/lib/utils";

interface ReportHeaderProps {
  title?: string;
  subtitle: string;
  detail?: string | null;
  className?: string;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title = "Heartland Boys Home",
  subtitle,
  detail,
  className,
}) => {
  const baseLogoSrc = `${import.meta.env.BASE_URL}files/BoysHomeLogo.png`;
  const [logoSrc, setLogoSrc] = React.useState(baseLogoSrc);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.fetch) {
      return;
    }

    let cancelled = false;

    const loadLogo = async () => {
      try {
        const response = await fetch(baseLogoSrc, { cache: "force-cache" });
        if (!response.ok) return;
        const blob = await response.blob();
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (!cancelled && dataUrl?.startsWith("data:")) {
          setLogoSrc(dataUrl);
        }
      } catch (error) {
        // fall back to base logo src silently
      }
    };

    loadLogo();

    return () => {
      cancelled = true;
    };
  }, [baseLogoSrc]);

  return (
    <div
      className={cn(
        "text-center mb-6 bg-gradient-to-r from-red-800 via-red-700 to-amber-600 text-white p-6 rounded-lg",
        className
      )}
    >
      <img
        src={logoSrc}
        alt="Heartland Boys Home Logo"
        className="h-16 mx-auto mb-4 object-contain"
        crossOrigin="anonymous"
      />
      <h1 className="text-3xl font-bold">{title}</h1>
      <h2 className="text-xl font-semibold mt-1">{subtitle}</h2>
      {detail && (
        <div className="text-lg mt-2 font-medium">
          {detail}
        </div>
      )}
    </div>
  );
};
