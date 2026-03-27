import api from "./api";

export const investmentService = {
  getInvestments: (params) => api.get("/investments", { params }),
  addInvestment: (data) => api.post("/investments", data),
  updateInvestment: (id, data) => api.put(`/investments/${id}`, data),
  deleteInvestment: (id) => api.delete(`/investments/${id}`),
  getInvestmentSummary: () => api.get("/investments/summary"),
};
