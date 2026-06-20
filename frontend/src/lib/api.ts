const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

let authToken: string | null = null;
export const setAuthToken = (token: string | null) => { authToken = token; };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  if (init?.headers) Object.assign(headers, init.headers as Record<string, string>);

  const res = await fetch(`${BASE}/api${path}`, { ...init, headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${res.status}: ${txt}`);
  }
  return res.json();
}

export const api = {
  // Auth
  authSession: (session_token: string) =>
    request<any>("/auth/session", { method: "POST", body: JSON.stringify({ session_token }) }),
  authMe: () => request<any>("/auth/me"),
  authLogout: () => request<any>("/auth/logout", { method: "POST" }),

  // Settings
  getSettings: () => request<any>("/settings"),
  updateSettings: (body: any) => request<any>("/settings", { method: "PUT", body: JSON.stringify(body) }),

  // Dashboard
  getDashboard: () => request<any>("/dashboard"),

  // Accounts
  listAccounts: () => request<any[]>("/accounts"),
  createAccount: (body: { name: string; accountType: "25K" | "50K" }) =>
    request<any>("/accounts", { method: "POST", body: JSON.stringify(body) }),
  getAccount: (id: string) => request<any>(`/accounts/${id}`),
  updateAccount: (id: string, body: any) =>
    request<any>(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteAccount: (id: string) => request<any>(`/accounts/${id}`, { method: "DELETE" }),
  addFundedDay: (id: string, body: { dayNumber: number; profit: number; date?: string }) =>
    request<any>(`/accounts/${id}/funded-days`, { method: "POST", body: JSON.stringify(body) }),
  removeFundedDay: (id: string, dayNumber: number) =>
    request<any>(`/accounts/${id}/funded-days/${dayNumber}`, { method: "DELETE" }),
  addPayout: (id: string, body: { grossProfit: number; date?: string }) =>
    request<any>(`/accounts/${id}/payouts`, { method: "POST", body: JSON.stringify(body) }),
  deletePayout: (id: string, payoutId: string) =>
    request<any>(`/accounts/${id}/payouts/${payoutId}`, { method: "DELETE" }),

  // Plan
  getPlan: () => request<any[]>("/plan"),
  updatePlanDay: (dayNumber: number, body: any) =>
    request<any>(`/plan/${dayNumber}`, { method: "PUT", body: JSON.stringify(body) }),

  // Journal
  listJournal: () => request<any[]>("/journal"),
  createJournal: (body: any) =>
    request<any>("/journal", { method: "POST", body: JSON.stringify(body) }),
  updateJournal: (id: string, body: any) =>
    request<any>(`/journal/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteJournal: (id: string) =>
    request<any>(`/journal/${id}`, { method: "DELETE" }),

  // Copy Trading
  getCopyTrading: () => request<any>("/copy-trading"),
  setMaster: (id: string) => request<any>(`/copy-trading/master/${id}`, { method: "PUT" }),
};
