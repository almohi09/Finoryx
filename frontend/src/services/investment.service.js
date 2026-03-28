import api from "./api";

export const investmentService = {
  getInvestments: (params) => api.get("/investments", { params }),
  addInvestment: (data) => api.post("/investments", data),
  updateInvestment: (id, data) => api.put(`/investments/${id}`, data),
  deleteInvestment: (id) => api.delete(`/investments/${id}`),
  getInvestmentSummary: () => api.get("/investments/summary"),
  getTrades: () => api.get("/investments/trades"),
  addTrade: (data) => api.post("/investments/trades", data),
  getTradeSummary: () => api.get("/investments/trades/summary"),
  getBrokerAccount: () => api.get("/investments/broker/account"),
  getBrokerPositions: () => api.get("/investments/broker/positions"),
  searchBrokerAssets: (q, limit = 15) => api.get("/investments/broker/assets/search", { params: { q, limit } }),
};
