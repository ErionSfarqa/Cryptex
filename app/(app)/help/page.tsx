import Card from "@/components/ui/Card";
import TopNav from "@/components/TopNav";

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-8">
      <TopNav title="Help & Support" />
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <h2 className="text-xl font-bold mb-4">Demo Trading Platform</h2>
            <p className="text-[var(--muted)] mb-4">
                This is a simulation environment designed for practice. No real funds are used.
                Market data is sourced from real exchanges but is <strong>delayed by 15 minutes</strong>.
            </p>
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--panel-strong)]">
                <h3 className="font-semibold mb-2">Disclaimer</h3>
                <p className="text-sm text-[var(--muted)]">
                    All prices, execution speeds, and market conditions are simulated. 
                    Past performance in this demo environment does not guarantee future results in live trading.
                </p>
            </div>
        </Card>

        <Card>
            <h2 className="text-xl font-bold mb-4">Trading Rules</h2>
            <ul className="list-disc pl-5 space-y-2 text-[var(--muted)]">
                <li>
                    <strong className="text-[var(--text)]">Balance Reset:</strong> You can reset your demo balance to $10,000 once every 24 hours via the Admin panel or automatically if eligible.
                </li>
                <li>
                    <strong className="text-[var(--text)]">Execution:</strong> Orders are filled at the latest available price (15m delayed). Large orders do not impact the market.
                </li>
                <li>
                    <strong className="text-[var(--text)]">Liquidation:</strong> Currently, there is no forced liquidation logic, but you should manage your risk carefully.
                </li>
            </ul>
        </Card>

        <Card>
            <h2 className="text-xl font-bold mb-4">P&L Calculation</h2>
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold">Unrealized P&L</h3>
                    <p className="text-sm text-[var(--muted)]">
                        (Current Price - Avg Entry Price) × Quantity
                    </p>
                </div>
                <div>
                    <h3 className="font-semibold">Realized P&L</h3>
                    <p className="text-sm text-[var(--muted)]">
                        Calculated when you close a position. The profit or loss is added to or subtracted from your Demo Balance.
                    </p>
                </div>
                <div>
                    <h3 className="font-semibold">Equity</h3>
                    <p className="text-sm text-[var(--muted)]">
                        Demo Balance + Unrealized P&L. This represents the total value of your account if all positions were closed immediately.
                    </p>
                </div>
            </div>
        </Card>

        <Card>
            <h2 className="text-xl font-bold mb-4">Stop Loss & Take Profit</h2>
            <p className="text-[var(--muted)] mb-4">
                You can set SL and TP levels when placing an order or update them for an existing position.
            </p>
            <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span><strong>Stop Loss (SL):</strong> Auto-closes your position to limit losses when price moves against you.</span>
                </li>
                <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span><strong>Take Profit (TP):</strong> Auto-closes your position to secure profits when price reaches your target.</span>
                </li>
            </ul>
            <p className="mt-4 text-xs text-[var(--muted)]">
                Note: SL/TP triggers are checked every 10 seconds against the latest 15-min delayed price.
            </p>
        </Card>
      </div>
    </div>
  );
}
