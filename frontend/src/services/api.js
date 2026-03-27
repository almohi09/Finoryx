import axios from "axios";
import { API_BASE_URL, API_CONFIGURATION_ERROR } from "../constants";
import { getStoredToken, clearStoredToken } from "../utils/auth";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (API_CONFIGURATION_ERROR) {
    return Promise.reject(new Error(API_CONFIGURATION_ERROR));
  }

  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearStoredToken();
    }

    return Promise.reject(error);
  }
);

export default api;
