import api from "./api";

const ADVISOR_CACHE_TTL_MS = 30000;
const advisorCache = new Map();

const cacheKey = (params = {}) => JSON.stringify({
  scope: params.scope || "overall",
  question: params.question || "",
});

export const financeService = {
  // Income
  getIncomes: (params) => api.get("/finance/income", { params }),
  addIncome: (data) => api.post("/finance/income", data),
  updateIncome: (id, data) => api.put(`/finance/income/${id}`, data),
  deleteIncome: (id) => api.delete(`/finance/income/${id}`),

  // Expenses
  getExpenses: (params) => api.get("/finance/expense", { params }),
  addExpense: (data) => api.post("/finance/expense", data),
  updateExpense: (id, data) => api.put(`/finance/expense/${id}`, data),
  deleteExpense: (id) => api.delete(`/finance/expense/${id}`),

  // Summary
  getMonthlySummary: (params) => api.get("/finance/summary", { params }),
  getCategoryBreakdown: (params) => api.get("/finance/category-breakdown", { params }),

  // Bank integrations
  createBankLinkToken: () => api.post("/finance/bank/link-token"),
  exchangeBankPublicToken: (publicToken) => api.post("/finance/bank/exchange-public-token", { publicToken }),
  searchBankInstitutions: (q, limit = 10) => api.get("/finance/bank/institutions/search", { params: { q, limit } }),
  getBankAccounts: () => api.get("/finance/bank-accounts"),
  addBankAccount: (data) => api.post("/finance/bank-accounts", data),
  syncBankAccount: (id) => api.post(`/finance/bank-accounts/${id}/sync`),
  getBankTransactions: () => api.get("/finance/bank-transactions"),

  // Advisor
  getAdvisorHealth: () => api.get("/finance/advisor/health"),
  getAdvisorInsights: async (params = {}) => {
    const key = cacheKey(params);
    const existing = advisorCache.get(key);
    if (existing && Date.now() - existing.at < ADVISOR_CACHE_TTL_MS) {
      return { data: existing.data };
    }

    const response = await api.get("/finance/advisor", { params });
    if (response.data?.metadata?.source && response.data.metadata.source !== "rules") {
      advisorCache.set(key, { at: Date.now(), data: response.data });
    }
    return response;
  },
  queryAdvisor: async (data = {}) => {
    const response = await api.post("/finance/advisor/query", data);
    const key = cacheKey({ scope: data.scope, question: data.question || "" });
    if (response.data?.metadata?.source && response.data.metadata.source !== "rules") {
      advisorCache.set(key, { at: Date.now(), data: response.data });
    }
    return response;
  },
};
