import api from "./api";

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
  getAdvisorInsights: () => api.get("/finance/advisor"),
};
