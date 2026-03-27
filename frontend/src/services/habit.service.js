import api from "./api";

export const habitService = {
  getHabits: () => api.get("/habits"),
  addHabit: (data) => api.post("/habits", data),
  updateHabit: (id, data) => api.put(`/habits/${id}`, data),
  deleteHabit: (id) => api.delete(`/habits/${id}`),
  markComplete: (id) => api.post(`/habits/${id}/complete`),
  getHabitStats: () => api.get("/habits/stats"),
};
