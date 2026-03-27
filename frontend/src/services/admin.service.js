import api from "./api";

export const adminService = {
  getUsers: (params) => api.get("/admin/users", { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getAnalytics: () => api.get("/admin/analytics"),
  getPlatformStats: () => api.get("/admin/stats"),
  getFeedback: () => api.get("/admin/feedback"),
  respondFeedback: (id, data) => api.put(`/admin/feedback/${id}`, data),
};
