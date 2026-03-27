import api from "./api";

export const goalService = {
  getGoals: () => api.get("/goals"),
  addGoal: (data) => api.post("/goals", data),
  updateGoal: (id, data) => api.put(`/goals/${id}`, data),
  deleteGoal: (id) => api.delete(`/goals/${id}`),
  addContribution: (id, amount) => api.post(`/goals/${id}/contribute`, { amount }),
};
