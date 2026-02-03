 "use client";
 
 import { useMemo, useState } from "react";
 import { useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { formatUsd } from "@/lib/utils";
import { cn } from "@/lib/cn";
 
export default function OrderForm({
  symbol,
  latestPrice,
  compact = false,
}: {
  symbol: string;
  latestPrice: number;
  compact?: boolean;
}) {
   const qc = useQueryClient();
   const [side, setSide] = useState<"BUY" | "SELL">("BUY");
   const [type, setType] = useState<"MARKET" | "LIMIT">("MARKET");
   const [qty, setQty] = useState("0.01");
   const [limitPrice, setLimitPrice] = useState("");
   const [stopLoss, setStopLoss] = useState("");
   const [takeProfit, setTakeProfit] = useState("");
   const [message, setMessage] = useState<string | null>(null);
 
   const estimatedNotional = useMemo(() => {
     const quantity = Number(qty || 0);
     const price =
       type === "LIMIT" && limitPrice ? Number(limitPrice) : Number(latestPrice ?? 0);
     return Number.isFinite(quantity) && Number.isFinite(price)
       ? quantity * price
       : 0;
   }, [qty, type, limitPrice, latestPrice]);
 
   const placeOrder = async () => {
     setMessage(null);
     const quantity = Number(qty);
     if (!Number.isFinite(quantity) || quantity <= 0) {
       setMessage("Quantity must be a number greater than 0.");
       return;
     }
    const payload = {
      symbol,
      side,
      type,
      quantity,
      limitPrice: type === "LIMIT" && limitPrice ? Number(limitPrice) : null,
      sl: stopLoss ? Number(stopLoss) : null,
      tp: takeProfit ? Number(takeProfit) : null,
    };
     const res = await fetch("/api/trade/order", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(payload),
     });
     const data = await res.json().catch(() => ({}));
     if (!res.ok) {
       setMessage(data.error ?? "Order failed.");
     } else {
       setMessage(data.filled ? "Order filled." : "Order placed.");
       setQty("0.01");
       setLimitPrice("");
       qc.invalidateQueries({ queryKey: ["portfolio"] });
       qc.invalidateQueries({ queryKey: ["trades"] });
     }
   };
 
  return (
    <div
      className={cn(
        "rounded-3xl border border-[var(--border)] bg-[var(--panel)] shadow-sm",
        compact ? "p-1 w-[min(80vw,240px)] max-w-[240px]" : "p-4"
      )}
    >
      <div className={cn("flex flex-wrap items-center justify-between", compact ? "gap-1" : "gap-3")}>
        <h3 className="text-lg font-semibold">Place order</h3>
        <Badge tone="neutral">Order ticket</Badge>
      </div>
      <div className={cn("grid", compact ? "mt-1 gap-1" : "mt-3 gap-3")}>
        <div className={cn("flex", compact ? "gap-1" : "gap-2")}>
          <Button
            variant={side === "BUY" ? "primary" : "secondary"}
            className="flex-1"
            onClick={() => setSide("BUY")}
          >
            Buy
           </Button>
           <Button
             variant={side === "SELL" ? "primary" : "secondary"}
             className="flex-1"
             onClick={() => setSide("SELL")}
          >
            Sell
          </Button>
        </div>
        <div className={cn("flex", compact ? "gap-1" : "gap-2")}>
          <Button
            variant={type === "MARKET" ? "primary" : "secondary"}
            className="flex-1"
            onClick={() => setType("MARKET")}
          >
            Market
           </Button>
           <Button
             variant={type === "LIMIT" ? "primary" : "secondary"}
             className="flex-1"
             onClick={() => setType("LIMIT")}
          >
            Limit
          </Button>
        </div>
         <div>
           <label className="text-xs uppercase tracking-widest text-[var(--muted)]">
             Quantity ({symbol})
           </label>
           <Input value={qty} onChange={(e) => setQty(e.target.value)} />
         </div>
         {type === "LIMIT" ? (
           <div>
             <label className="text-xs uppercase tracking-widest text-[var(--muted)]">
               Limit price (USD)
             </label>
             <Input value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} />
           </div>
         ) : null}
        <div
          className={cn(
            "grid",
            compact ? "gap-1 sm:grid-cols-2" : "gap-2 md:grid-cols-2"
          )}
        >
          <div>
            <label className="text-xs uppercase tracking-widest text-[var(--muted)]">
              Stop-loss
            </label>
            <Input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
           </div>
           <div>
             <label className="text-xs uppercase tracking-widest text-[var(--muted)]">
               Take-profit
             </label>
             <Input value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
           </div>
         </div>
        <div className="text-xs text-[var(--muted)]">
          Estimated notional: {formatUsd(estimatedNotional)}
        </div>
        {message ? (
          <div
            className={cn(
              "rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] text-sm text-[var(--text)]",
              compact ? "px-2 py-1" : "px-3 py-2"
            )}
          >
            {message}
          </div>
        ) : null}
        <Button onClick={placeOrder}>Submit order</Button>
       </div>
     </div>
   );
 }
