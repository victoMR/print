import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

type PriceTagProps = {
  amount: number | string;
  currency?: "MXN" | "USD";
  className?: string;
  note?: string;
};

export function PriceTag({ amount, currency = "MXN", className, note }: PriceTagProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-2xl font-semibold tracking-tight text-foreground">
        {formatCurrency(amount, currency)}
      </span>
      {note && (
        <span className="text-xs text-foreground/60">{note}</span>
      )}
      {!note && (
        <span className="text-xs text-foreground/60">
          {currency === "USD" ? "Tax not included · USD" : "IVA incluido · MXN"}
        </span>
      )}
    </div>
  );
}
