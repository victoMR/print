import { formatMxn } from "@/lib/utils";
import { cn } from "@/lib/utils";

type PriceTagProps = {
  amount: number | string;
  className?: string;
  note?: string;
};

export function PriceTag({ amount, className, note }: PriceTagProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-2xl font-semibold tracking-tight text-foreground">
        {formatMxn(amount)}
      </span>
      {note && (
        <span className="text-xs text-foreground/60">{note}</span>
      )}
      {!note && (
        <span className="text-xs text-foreground/60">IVA incluido · MXN</span>
      )}
    </div>
  );
}
