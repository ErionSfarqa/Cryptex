 "use client";
 
 import { useQuery, useQueryClient } from "@tanstack/react-query";
 import { useState } from "react";
 import Card from "@/components/ui/Card";
 import Button from "@/components/ui/Button";
 import Input from "@/components/ui/Input";
 import AdminCharts from "@/components/admin/AdminCharts";
 import { formatUsd } from "@/lib/utils";

 export default function AdminDashboard() {
   const qc = useQueryClient();

  type Overview = {
    totalUsers: number;
    totalOrders: number;
    totalPositions?: number;
    openPositions: number;
    totalPositionsOpen?: number;
    totalRealizedPnl?: number;
    totalClosedTrades: number;
    totalVolume24h: number;
    totalPnL24h: number;
    topSymbols: { symbol: string; count: number; volume: number }[];
    recentOrders: { id: string; user_id: string; symbol: string; side: string; order_type: string; quantity?: number | null; qty?: number | null; price?: number | null; status?: string | null; created_at: string }[];
    usersPerDay: { date: string; value: number }[];
    ordersPerDay: { date: string; value: number }[];
    pnlPerDay: { date: string; value: number }[];
  };
  const { data: overview } = useQuery<Overview>({
    queryKey: ["admin99", "overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin99/overview");
      const data = await res.json();
      return data;
    },
    refetchInterval: 8000,
    refetchIntervalInBackground: false,
    placeholderData: (prev) => prev,
  });

  type ChartsResp = {
    usersPerDay: { t: string; v: number }[];
    ordersPerDay: { t: string; v: number }[];
    pnlPerDay: { t: string; v: number }[];
    equitySeries?: { t: string; v: number }[];
    openPositionsBySymbol?: { label: string; v: number }[];
  };

   type UserItem = {
     id: string;
     email?: string | null;
     role?: string | null;
     demo_balance?: number | null;
     last_reset_at?: string | null;
     trading_disabled?: boolean | null;
     created_at?: string | null;
     last_sign_in_at?: string | null;
   };

   type UsersResp = {
     users: UserItem[];
     total?: number;
     page?: number;
     limit?: number;
     source?: "auth" | "profiles";
     error?: string;
   };

   const [usersPage, setUsersPage] = useState(1);
   const [usersQuery, setUsersQuery] = useState("");
   const USERS_LIMIT = 25;
   const { data: usersResp } = useQuery<UsersResp>({
     queryKey: ["admin99", "users", usersPage, usersQuery],
     queryFn: async () => {
       const params = new URLSearchParams({
         page: String(usersPage),
         limit: String(USERS_LIMIT),
       });
       if (usersQuery.trim()) params.set("q", usersQuery.trim());
       const res = await fetch(`/api/admin99/users?${params.toString()}`);
       if (!res.ok) {
         const payload = await res.json().catch(() => ({}));
         return {
           users: [],
           total: 0,
           error: String(payload?.error ?? `Users fetch failed (${res.status})`),
         };
       }
       return res.json();
     },
     refetchInterval: 8000,
     refetchIntervalInBackground: false,
     placeholderData: (prev) => prev,
   });
   const users = usersResp?.users ?? [];
   const usersTotal = Number(usersResp?.total ?? 0);
   const usersSource = usersResp?.source;
   const usersError = usersResp?.error;
   const usersTotalPages = Math.max(1, Math.ceil(usersTotal / USERS_LIMIT));

   const [positionsPage, setPositionsPage] = useState(1);
   const [positionsQuery, setPositionsQuery] = useState("");
   const [positionsSymbol, setPositionsSymbol] = useState("");
   const [positionsStatus, setPositionsStatus] = useState("open");
   const POSITIONS_LIMIT = 25;
   const { data: positionsResp } = useQuery({
     queryKey: ["admin99", "positions", positionsPage, positionsQuery, positionsSymbol, positionsStatus],
     queryFn: async () => {
       const params = new URLSearchParams({
         page: String(positionsPage),
         limit: String(POSITIONS_LIMIT),
       });
       if (positionsQuery.trim()) params.set("q", positionsQuery.trim());
       if (positionsSymbol.trim()) params.set("symbol", positionsSymbol.trim().toUpperCase());
       if (positionsStatus) params.set("status", positionsStatus);
       const res = await fetch(`/api/admin99/positions?${params.toString()}`);
       const data = await res.json();
       return data;
     },
     refetchInterval: 8000,
     refetchIntervalInBackground: false,
     placeholderData: (prev) => prev,
   });
   const positions = positionsResp?.positions ?? [];
   const positionsTotal = Number(positionsResp?.total ?? 0);
   const positionsTotalPages = Math.max(1, Math.ceil(positionsTotal / POSITIONS_LIMIT));

   const [ordersPage, setOrdersPage] = useState(1);
   const [ordersQuery, setOrdersQuery] = useState("");
   const [ordersSymbol, setOrdersSymbol] = useState("");
   const [ordersStatus, setOrdersStatus] = useState("");
   const ORDERS_LIMIT = 25;
   const { data: ordersResp } = useQuery({
     queryKey: ["admin99", "orders", ordersPage, ordersQuery, ordersSymbol, ordersStatus],
     queryFn: async () => {
       const params = new URLSearchParams({
         page: String(ordersPage),
         limit: String(ORDERS_LIMIT),
       });
       if (ordersQuery.trim()) params.set("q", ordersQuery.trim());
       if (ordersSymbol.trim()) params.set("symbol", ordersSymbol.trim().toUpperCase());
       if (ordersStatus.trim()) params.set("status", ordersStatus.trim());
       const res = await fetch(`/api/admin99/orders?${params.toString()}`);
       const data = await res.json();
       return data;
     },
     refetchInterval: 8000,
     refetchIntervalInBackground: false,
     placeholderData: (prev) => prev,
   });
   const orders = ordersResp?.orders ?? [];
   const ordersTotal = Number(ordersResp?.total ?? 0);
   const ordersTotalPages = Math.max(1, Math.ceil(ordersTotal / ORDERS_LIMIT));

   const resetBalance = async (userId: string) => {
     if (!confirm("Reset this user's balance to $10,000?")) return;
     const res = await fetch("/api/admin99/balance", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ userId, reset: true }),
     });
     if (res.ok) {
       qc.invalidateQueries({ queryKey: ["admin99"] });
     }
   };
 
   const promote = async (userId: string) => {
    await fetch("/api/admin99/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "promote", userId }),
    });
    qc.invalidateQueries({ queryKey: ["admin99"] });
  };
 
   const demote = async (userId: string) => {
    await fetch("/api/admin99/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "demote", userId }),
    });
    qc.invalidateQueries({ queryKey: ["admin99"] });
  };
 
   const disableTrading = async (userId: string, disabled: boolean | null | undefined) => {
    await fetch("/api/admin99/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: disabled ? "enable_trading" : "disable_trading", userId }),
    });
    qc.invalidateQueries({ queryKey: ["admin99"] });
  };
 
   const forceClose = async (positionId: string) => {
     if (!confirm("Force-close this position?")) return;
    await fetch("/api/admin99/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positionId }),
    });
    qc.invalidateQueries({ queryKey: ["admin99"] });
  };

   type PositionItem = {
     id: string;
     user_id: string;
     user_email?: string | null;
     symbol: string;
     quantity: number;
     avg_price: number | null;
     unrealized_pnl?: number | null;
     updated_at?: string | null;
   };
   type OrderItem = {
     id: string;
     user_id: string;
     user_email?: string | null;
     symbol: string;
     side: string | null;
     order_type: string;
     quantity: number;
     price: number | null;
     status: string | null;
     created_at: string;
     realized_pnl?: number | null;
   };

   const [rangeDays, setRangeDays] = useState<7 | 30>(7);
   const { data: charts } = useQuery<ChartsResp>({
     queryKey: ["admin99", "charts", rangeDays],
     queryFn: async () => {
       const res = await fetch(`/api/admin99/charts?days=${rangeDays}`);
       if (!res.ok) {
         const txt = await res.text().catch(() => "");
         console.error(txt || `charts fetch failed: ${res.status}`);
         if (res.status === 401) {
           window.location.href = "/admin99";
         }
         return { usersPerDay: [], ordersPerDay: [], pnlPerDay: [] };
       }
       return res.json();
     },
     refetchInterval: 10000,
     refetchIntervalInBackground: false,
     placeholderData: (prev) => prev,
   });

   const usersPerDay = (charts?.usersPerDay ?? []).map((p) => ({
     date: String(p.t ?? "").slice(0, 10),
     value: Number(p.v ?? 0),
   }));
   const ordersPerDay = (charts?.ordersPerDay ?? []).map((p) => ({
     date: String(p.t ?? "").slice(0, 10),
     value: Number(p.v ?? 0),
   }));
   const pnlPerDay = (charts?.pnlPerDay ?? []).map((p) => ({
     date: String(p.t ?? "").slice(0, 10),
     value: Number(p.v ?? 0),
   }));
 
   return (
     <div className="flex flex-col gap-8">
      {usersError ? (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
          <div className="font-semibold">Users failed to load.</div>
          <div className="mt-1 text-xs text-red-200/80">{usersError}</div>
        </div>
      ) : usersResp && usersSource !== "auth" ? (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="font-semibold">Limited user list</div>
          <div className="mt-1 text-xs text-amber-100/80">
            Showing users from <span className="font-mono">profiles</span>. To show all Supabase Auth users, set
            <span className="font-mono"> SUPABASE_SERVICE_ROLE_KEY</span> in <span className="font-mono">.env.local</span>
            and restart the dev server.
          </div>
        </div>
      ) : null}
      <Card>
        <h2 className="mb-4 text-xl font-semibold">Overview</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] p-4">
            <div className="text-sm text-[var(--muted)]">Users</div>
            <div className="text-2xl font-semibold">{overview?.totalUsers ?? 0}</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-4">
            <div className="text-sm text-[var(--muted)]">Orders</div>
            <div className="text-2xl font-semibold">{overview?.totalOrders ?? 0}</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-4">
            <div className="text-sm text-[var(--muted)]">Open Positions</div>
            <div className="text-2xl font-semibold">{overview?.openPositions ?? overview?.totalPositionsOpen ?? 0}</div>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] p-4">
            <div className="mb-2 text-sm text-[var(--muted)]">24h Volume</div>
            <div className="text-xl font-semibold">{formatUsd(overview?.totalVolume24h ?? 0)}</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-4">
            <div className="mb-2 text-sm text-[var(--muted)]">24h Realized PnL</div>
            <div className="text-xl font-semibold">{formatUsd(overview?.totalPnL24h ?? 0)}</div>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2">
          <Button variant={rangeDays === 7 ? "primary" : "secondary"} onClick={() => setRangeDays(7)}>
            7d
          </Button>
          <Button variant={rangeDays === 30 ? "primary" : "secondary"} onClick={() => setRangeDays(30)}>
            30d
          </Button>
        </div>
        <div className="mt-4">
          <AdminCharts usersPerDay={usersPerDay} ordersPerDay={ordersPerDay} pnlPerDay={pnlPerDay} />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium">Top Symbols</h3>
            <div className="flex flex-col gap-2">
              {(overview?.topSymbols ?? []).map((s) => {
                const pct = Math.min(100, Math.round(((s.volume ?? 0) / ((overview?.totalVolume24h || 1))) * 100));
                return (
                  <div key={s.symbol}>
                    <div className="flex justify-between text-xs text-[var(--muted)]">
                      <span>{s.symbol}</span>
                      <span>{formatUsd(s.volume)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded bg-[var(--panel-strong)]">
                      <div className="h-2 rounded bg-[var(--border-strong)]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">Recent Orders</h3>
            <div className="max-h-64 overflow-x-auto overflow-y-auto">
              <table className="min-w-[520px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                    <th className="pb-2">Symbol</th>
                    <th className="pb-2">Side</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Price</th>
                    <th className="pb-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.recentOrders ?? []).map((o) => (
                    <tr key={o.id} className="border-b border-[var(--border)]">
                      <td className="py-2">{o.symbol}</td>
                      <td className="py-2">{o.side}</td>
                      <td className="py-2 text-right">{Number(o.quantity ?? o.qty ?? 0)}</td>
                      <td className="py-2 text-right">{formatUsd(o.price ?? 0)}</td>
                      <td className="py-2 text-[var(--muted)]">{new Date(o.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>

       <Card>
         <h2 className="mb-4 text-xl font-semibold">User Accounts ({usersTotal})</h2>
         <div className="mb-4 grid gap-3 md:grid-cols-3">
           <div>
             <label className="text-xs uppercase tracking-widest text-[var(--muted)]">Search</label>
             <Input value={usersQuery} onChange={(e) => setUsersQuery(e.target.value)} />
           </div>
           <div className="flex items-end gap-2">
             <Button variant="secondary" onClick={() => setUsersPage(1)}>Apply</Button>
             <Button variant="secondary" onClick={() => { setUsersQuery(""); setUsersPage(1); }}>Clear</Button>
           </div>
           <div className="flex items-end justify-end gap-2 text-sm text-[var(--muted)]">
             <span>Page {usersPage} / {usersTotalPages}</span>
             <Button variant="secondary" onClick={() => setUsersPage(Math.max(1, usersPage - 1))} disabled={usersPage <= 1}>Prev</Button>
             <Button variant="secondary" onClick={() => setUsersPage(Math.min(usersTotalPages, usersPage + 1))} disabled={usersPage >= usersTotalPages}>Next</Button>
           </div>
         </div>
         <div className="overflow-x-auto">
           <table className="min-w-[1000px] w-full text-left text-sm">
             <thead>
               <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                 <th className="pb-2">User ID</th>
                 <th className="pb-2">Email</th>
                 <th className="pb-2">Role</th>
                 <th className="pb-2">Created</th>
                 <th className="pb-2">Last Sign In</th>
                 <th className="pb-2 text-right">Balance</th>
                 <th className="pb-2 text-right">Trading</th>
                 <th className="pb-2 text-right">Last Reset</th>
                 <th className="pb-2 text-right">Actions</th>
               </tr>
             </thead>
             <tbody>
               {(users ?? []).map((u: UserItem) => (
                 <tr key={u.id} className="border-b border-[var(--border)]">
                   <td className="py-2 font-mono text-xs text-[var(--muted)]">{u.id}</td>
                   <td className="py-2">{u.email ?? "-"}</td>
                   <td className="py-2">{u.role ?? "-"}</td>
                   <td className="py-2">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</td>
                   <td className="py-2">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "-"}</td>
                   <td className="py-2 text-right font-medium">{formatUsd(u.demo_balance ?? 0)}</td>
                   <td className="py-2 text-right">{u.trading_disabled ? "Disabled" : "Enabled"}</td>
                   <td className="py-2 text-right text-[var(--muted)]">
                     {u.last_reset_at ? new Date(u.last_reset_at).toLocaleDateString() : "-"}
                   </td>
                   <td className="py-2 flex justify-end gap-2">
                     <Button className="px-3 py-1 text-xs h-auto" variant="secondary" onClick={() => resetBalance(u.id)}>Reset</Button>
                     <Button className="px-3 py-1 text-xs h-auto" variant="secondary" onClick={() => promote(u.id)}>Promote</Button>
                     <Button className="px-3 py-1 text-xs h-auto" variant="secondary" onClick={() => demote(u.id)}>Demote</Button>
                     <Button className="px-3 py-1 text-xs h-auto" variant="secondary" onClick={() => disableTrading(u.id, u.trading_disabled)}>
                       {u.trading_disabled ? "Enable" : "Disable"}
                     </Button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </Card>

       <Card>
         <h2 className="mb-4 text-xl font-semibold">All Orders ({ordersTotal})</h2>
         <div className="mb-4 grid gap-3 md:grid-cols-4">
           <div>
             <label className="text-xs uppercase tracking-widest text-[var(--muted)]">Search</label>
             <Input value={ordersQuery} onChange={(e) => setOrdersQuery(e.target.value)} />
           </div>
           <div>
             <label className="text-xs uppercase tracking-widest text-[var(--muted)]">Symbol</label>
             <Input value={ordersSymbol} onChange={(e) => setOrdersSymbol(e.target.value)} />
           </div>
           <div>
             <label className="text-xs uppercase tracking-widest text-[var(--muted)]">Status</label>
             <Input value={ordersStatus} onChange={(e) => setOrdersStatus(e.target.value)} />
           </div>
           <div className="flex items-end justify-end gap-2 text-sm text-[var(--muted)]">
             <span>Page {ordersPage} / {ordersTotalPages}</span>
             <Button variant="secondary" onClick={() => setOrdersPage(Math.max(1, ordersPage - 1))} disabled={ordersPage <= 1}>Prev</Button>
             <Button variant="secondary" onClick={() => setOrdersPage(Math.min(ordersTotalPages, ordersPage + 1))} disabled={ordersPage >= ordersTotalPages}>Next</Button>
           </div>
         </div>
         <div className="overflow-x-auto">
           <table className="min-w-[900px] w-full text-left text-sm">
             <thead>
               <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                 <th className="pb-2">Order ID</th>
                 <th className="pb-2">User</th>
                 <th className="pb-2">Symbol</th>
                 <th className="pb-2">Side</th>
                 <th className="pb-2">Type</th>
                 <th className="pb-2 text-right">Qty</th>
                 <th className="pb-2 text-right">Price</th>
                 <th className="pb-2">Status</th>
                 <th className="pb-2">Time</th>
               </tr>
             </thead>
             <tbody>
               {(orders ?? []).map((o: OrderItem) => (
                 <tr key={o.id} className="border-b border-[var(--border)]">
                   <td className="py-2 font-mono text-xs text-[var(--muted)]">{o.id}</td>
                   <td className="py-2">{o.user_email ?? o.user_id}</td>
                   <td className="py-2">{o.symbol}</td>
                   <td className="py-2">{o.side ?? "-"}</td>
                   <td className="py-2">{o.order_type}</td>
                   <td className="py-2 text-right">{o.quantity}</td>
                   <td className="py-2 text-right">{formatUsd(o.price ?? 0)}</td>
                   <td className="py-2">{o.status ?? "-"}</td>
                   <td className="py-2 text-[var(--muted)]">{new Date(o.created_at).toLocaleString()}</td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </Card>

       <Card>
         <h2 className="mb-4 text-xl font-semibold">Positions ({positionsTotal})</h2>
         <div className="mb-4 grid gap-3 md:grid-cols-4">
           <div>
             <label className="text-xs uppercase tracking-widest text-[var(--muted)]">Search</label>
             <Input value={positionsQuery} onChange={(e) => setPositionsQuery(e.target.value)} />
           </div>
           <div>
             <label className="text-xs uppercase tracking-widest text-[var(--muted)]">Symbol</label>
             <Input value={positionsSymbol} onChange={(e) => setPositionsSymbol(e.target.value)} />
           </div>
           <div>
             <label className="text-xs uppercase tracking-widest text-[var(--muted)]">Status</label>
             <Input value={positionsStatus} onChange={(e) => setPositionsStatus(e.target.value)} />
           </div>
           <div className="flex items-end justify-end gap-2 text-sm text-[var(--muted)]">
             <span>Page {positionsPage} / {positionsTotalPages}</span>
             <Button variant="secondary" onClick={() => setPositionsPage(Math.max(1, positionsPage - 1))} disabled={positionsPage <= 1}>Prev</Button>
             <Button variant="secondary" onClick={() => setPositionsPage(Math.min(positionsTotalPages, positionsPage + 1))} disabled={positionsPage >= positionsTotalPages}>Next</Button>
           </div>
         </div>
         <div className="overflow-x-auto">
           <table className="min-w-[900px] w-full text-left text-sm">
             <thead>
               <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                 <th className="pb-2">Position ID</th>
                 <th className="pb-2">User ID</th>
                 <th className="pb-2">Symbol</th>
                 <th className="pb-2 text-right">Qty</th>
                 <th className="pb-2 text-right">Entry</th>
                 <th className="pb-2 text-right">Unrealized</th>
                 <th className="pb-2">Updated</th>
                 <th className="pb-2 text-right">Action</th>
               </tr>
             </thead>
             <tbody>
               {(positions ?? []).map((p: PositionItem) => (
                 <tr key={p.id} className="border-b border-[var(--border)]">
                   <td className="py-2 font-mono text-xs text-[var(--muted)]">{p.id}</td>
                   <td className="py-2 font-mono text-xs text-[var(--muted)]">{p.user_email ?? p.user_id}</td>
                   <td className="py-2">{p.symbol}</td>
                   <td className="py-2 text-right">{p.quantity}</td>
                    <td className="py-2 text-right">{formatUsd(p.avg_price ?? 0)}</td>
                   <td className="py-2 text-right">{formatUsd(p.unrealized_pnl ?? 0)}</td>
                   <td className="py-2 text-[var(--muted)]">{p.updated_at ? new Date(p.updated_at).toLocaleString() : "-"}</td>
                   <td className="py-2 text-right">
                     <Button className="px-3 py-1 text-xs h-auto" variant="secondary" onClick={() => forceClose(p.id)}>Force Close</Button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </Card>
     </div>
   );
 }
