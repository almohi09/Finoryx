import api from "./api";

export const dashboardService = {
  getSummary: () => api.get("/dashboard/summary"),
  getWealthGrowth: (params) => api.get("/dashboard/wealth-growth", { params }),
  getRecentTransactions: () => api.get("/dashboard/recent-transactions"),
  getHabitOverview: () => api.get("/dashboard/habit-overview"),
};
