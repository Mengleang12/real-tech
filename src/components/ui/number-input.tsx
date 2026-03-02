import * as React from "react";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

const NumberInput = ({
  value,
  onChange,
  min = 0,
  max = 99999,
  step = 1,
  disabled = false,
  className,
}: NumberInputProps) => {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <div className={cn("inline-flex items-center border border-input rounded-md overflow-hidden", className)}>
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || value <= min}
        className="h-8 w-8 flex items-center justify-center bg-muted/50 hover:bg-muted text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        disabled={disabled}
        className="h-8 w-12 text-center text-sm font-medium bg-background border-x border-input outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
      />
      <button
        type="button"
        onClick={increment}
        disabled={disabled || value >= max}
        className="h-8 w-8 flex items-center justify-center bg-muted/50 hover:bg-muted text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export { NumberInput };
