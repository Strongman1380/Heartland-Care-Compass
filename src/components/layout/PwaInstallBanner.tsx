import { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";

const DISMISSED_KEY = "pwa-install-banner-dismissed";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in window.navigator && (window.navigator as any).standalone === true);

export const PwaInstallBanner = () => {
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);
    // Show on mobile browsers only (iOS Safari or Android Chrome not yet installed)
    const isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent);
    if (isMobile) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="lg:hidden fixed top-[56px] inset-x-0 z-40 bg-[#823131] text-white px-4 py-2.5 flex items-center gap-3 shadow-md">
      <div className="flex-1 text-xs leading-snug">
        {isIos ? (
          <span>
            Install this app: tap{" "}
            <Share className="inline h-3.5 w-3.5 mx-0.5 -mt-0.5" />
            then <strong>Add to Home Screen</strong>
          </span>
        ) : (
          <span>
            Install this app: tap{" "}
            <strong>⋮ Menu → Add to Home Screen</strong>
          </span>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
