import axios from "axios";
import { API_BASE_URL, API_CONFIGURATION_ERROR } from "../constants";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (API_CONFIGURATION_ERROR) {
    return Promise.reject(new Error(API_CONFIGURATION_ERROR));
  }

  return config;
});

export default api;
