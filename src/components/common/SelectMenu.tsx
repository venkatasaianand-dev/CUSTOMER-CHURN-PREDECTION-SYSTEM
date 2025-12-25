import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  value: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  className?: string;
  listClassName?: string;
};

export default function SelectMenu({
  value,
  options,
  placeholder = "Select...",
  disabled,
  onChange,
  className,
  listClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const node = rootRef.current;
    if (!node) return;
    const updateRect = () => {
      const next = node.getBoundingClientRect();
      setRect(next);
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      if (path.length ? path.includes(root) : root.contains(event.target as Node)) return;
      setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleToggle = (event?: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    event?.preventDefault();
    setOpen((prev) => !prev);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((prev) => !prev);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const label = value ? value : placeholder;
  const labelClass = value ? "select-menu__value" : "select-menu__placeholder";

  return (
    <div className="select-menu" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        className={`select-menu__button ${className ?? ""}`}
        onPointerDown={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={labelClass}>{label}</span>
        <svg className="select-menu__chevron" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M6 8l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && rect
        ? createPortal(
            <>
              <div className="select-menu__backdrop" onPointerDown={() => setOpen(false)} />
              <div
                className={`select-menu__list scrollbar-modern ${listClassName ?? ""}`}
                role="listbox"
                style={{
                  position: "fixed",
                  left: rect.left,
                  top: rect.bottom + 8,
                  width: rect.width,
                }}
              >
                {options.map((opt) => {
                  const selected = opt === value;
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`select-menu__option ${selected ? "select-menu__option--selected" : ""}`}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        onChange(opt);
                        setOpen(false);
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
}
