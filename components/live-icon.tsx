import type { ReactNode } from "react";

type LiveIconProps = {
  children: ReactNode;
  variant?: "float" | "pulse" | "tick" | "wiggle" | "pop";
  active?: boolean;
  className?: string;
};

export default function LiveIcon({
  children,
  variant = "float",
  active = true,
  className = "",
}: LiveIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`fitmate-live-icon fitmate-live-icon--${variant} ${
        active ? "is-active" : ""
      } ${className}`}
    >
      {children}
    </span>
  );
}
