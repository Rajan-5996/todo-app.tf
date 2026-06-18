import axios, { AxiosError, AxiosHeaders } from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";

const storage = {
  getAccessToken: () => localStorage.getItem("accessToken") || "",
  setAccessToken: (token: string) => localStorage.setItem("accessToken", token),
  getRefreshToken: () => localStorage.getItem("refreshToken") || "",
  setRefreshToken: (token: string) => localStorage.setItem("refreshToken", token),
  clear: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
};

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const token = storage.getRefreshToken();
  if (!token) return null;

  isRefreshing = true;
  refreshPromise = apiClient
    .post("/auth/refresh", { refreshToken: token })
    .then((response) => {
      const { accessToken, refreshToken } = response.data;
      storage.setAccessToken(accessToken);
      storage.setRefreshToken(refreshToken);
      return accessToken;
    })
    .catch(() => {
      storage.clear();
      return null;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const token = storage.getAccessToken();
  if (token && config.headers) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?.url?.endsWith("/auth/refresh")) {
      const token = await refreshAccessToken();
      if (token && originalRequest) {
        const headers = new AxiosHeaders(originalRequest.headers ?? {});
        headers.set("Authorization", `Bearer ${token}`);
        originalRequest.headers = headers;
        return apiClient(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export interface TodoItem {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  userId: number;
}

export default {
  login: async (email: string, password: string) => {
    const response = await apiClient.post("/auth/login", { email, password });
    storage.setAccessToken(response.data.accessToken);
    storage.setRefreshToken(response.data.refreshToken);
    return response.data;
  },
  register: async (email: string, password: string) => {
    const response = await apiClient.post("/auth/register", { email, password });
    storage.setAccessToken(response.data.accessToken);
    storage.setRefreshToken(response.data.refreshToken);
    return response.data;
  },
  logout: () => {
    storage.clear();
  },
  getAccessToken: () => storage.getAccessToken(),
  getErrorMessage: (error: unknown) => {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.error || error.message;
    }
    return null;
  },
  fetchTodos: async (): Promise<TodoItem[]> => {
    const response = await apiClient.get("/todos");
    return response.data;
  },
  createTodo: async (payload: { title: string; description?: string }): Promise<TodoItem> => {
    const response = await apiClient.post("/todos", payload);
    return response.data;
  },
  updateTodo: async (id: number, payload: Partial<TodoItem>): Promise<TodoItem> => {
    const response = await apiClient.put(`/todos/${id}`, payload);
    return response.data;
  },
  deleteTodo: async (id: number): Promise<void> => {
    await apiClient.delete(`/todos/${id}`);
  },
};
