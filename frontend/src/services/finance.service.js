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
};
