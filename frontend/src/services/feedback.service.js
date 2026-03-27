import api from "./api";

export const feedbackService = {
  submitFeedback: (data) => api.post("/feedback", data),
  getMyFeedback: () => api.get("/feedback/me"),
};
