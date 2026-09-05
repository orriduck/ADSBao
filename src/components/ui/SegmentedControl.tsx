import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Native radios provide one tab stop and arrow-key selection without a
 * separate keyboard state machine. The label is the complete touch target. */
export default function SegmentedControl<Value extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
  disabled = false,
}: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: ReactNode }[];
  onChange: (value: Value) => void;
  className?: string;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn("soft-segmented-control", className)}>
      {options.map((option) => (
        <label key={option.value} className="soft-segment" data-active={value === option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={disabled}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
