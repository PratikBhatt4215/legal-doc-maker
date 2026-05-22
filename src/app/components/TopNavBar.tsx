import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

interface TopNavBarProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  rightElement?: React.ReactNode;
}

export function TopNavBar({ title, subtitle, onBack, rightElement }: TopNavBarProps) {
  // Wire Android hardware/gesture back button
  useEffect(() => {
    const handleBack = (e: PopStateEvent) => {
      e.preventDefault();
      onBack();
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, [onBack]);

  return (
    <div className="bg-[#1e3a5f] text-white shadow-lg sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-0 flex items-center h-14 gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors flex-shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base leading-tight truncate">{title}</p>
          {subtitle && (
            <p className="text-white/60 text-xs leading-tight truncate">{subtitle}</p>
          )}
        </div>

        {rightElement && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}
