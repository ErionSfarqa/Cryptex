export type Trade = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  qty: number;
  limitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  status: "OPEN" | "FILLED" | "CANCELLED";
  createdAt: string;
  filledAt: string | null;
  fillPrice: number | null;
  realizedPnl: number | null;
};

export type Asset = {
  id?: string;
  symbol: string;
  name: string;
  isActive?: boolean;
};

export type PortfolioPosition = {
  id: string;
  assetSymbol: string;
  qty: number;
  avgEntry: number;
  unrealizedPnl: number;
  stopLoss: number | null;
  takeProfit: number | null;
  latestPrice: number;
  marketValue: number;
};

export type PortfolioResponse = {
  balance: number;
  equity: number;
  positions: PortfolioPosition[];
};

export type NotificationItem = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type SettingsResponse = {
  settings: {
    firstRunComplete: boolean;
    darkMode: boolean;
    emailAlerts: boolean;
    inAppAlerts: boolean;
    demoBalance: number;
  } | null;
  profile: {
    name?: string | null;
    email?: string | null;
  } | null;
};

export type AdminUser = {
  id: string;
  email: string;
  role: string;
  demoBalance: number;
  lastResetAt: string | null;
};
