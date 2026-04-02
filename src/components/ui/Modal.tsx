import { useEffect, useRef } from "react";
import { clsx } from "../../lib/utils";

const sizeMap: Record<string, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth,
  size,
}: ModalProps) {
  const resolvedMax = maxWidth ?? (size ? sizeMap[size] : "max-w-2xl");
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      ref={overlayRef}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={clsx(
          "relative bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-full flex flex-col max-h-[90vh]",
          resolvedMax,
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
            <h2 className="text-base font-semibold text-neutral-100">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}
