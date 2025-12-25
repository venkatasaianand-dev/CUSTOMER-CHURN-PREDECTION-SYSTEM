import React from "react";

type Props = {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

const sizeMap: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-3 w-3 border-[2px]",
  sm: "h-4 w-4 border-[2px]",
  md: "h-6 w-6 border-[3px]",
  lg: "h-10 w-10 border-[4px]",
};

export default function Spinner({ size = "md", className = "", label = "Loading" }: Props) {
  return (
    <span
      className={[
        "inline-block rotate-slow rounded-full border-t-transparent",
        "border-primary-300 dark:border-primary-800",
        "border-r-primary-200 border-b-primary-200 dark:border-r-primary-700 dark:border-b-primary-700",
        "shadow-sm",
        sizeMap[size],
        className,
      ].join(" ")}
      aria-label={label}
      role="status"
    />
  );
}
