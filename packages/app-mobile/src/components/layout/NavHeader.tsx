import { cn } from "@readany/core/utils";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";

interface NavHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  className?: string;
  transparent?: boolean;
}

export function NavHeader({
  title,
  showBack = true,
  onBack,
  rightAction,
  className,
  transparent = false,
}: NavHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn(
        "relative flex shrink-0 items-center px-4",
        !transparent && "border-b border-border bg-background",
        className,
      )}
      style={{
        paddingTop: "var(--safe-area-top, 0px)",
        height: "calc(2.75rem + var(--safe-area-top, 0px))",
      }}
    >
      {/* Left: back button */}
      {showBack && (
        <button
          type="button"
          onClick={handleBack}
          className="flex h-11 w-11 items-center justify-center -ml-2"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Center: title */}
      {title && (
        <h1
          className="absolute left-1/2 -translate-x-1/2 text-base font-semibold truncate max-w-[60%]"
          style={{ top: "calc(var(--safe-area-top, 0px) + 1.375rem)", transform: "translate(-50%, -50%)" }}
        >
          {title}
        </h1>
      )}

      {/* Right: action slot */}
      {rightAction && (
        <div className="ml-auto flex items-center gap-2">{rightAction}</div>
      )}
    </header>
  );
}
