import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5842/api'

const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
})

// ── Storage helpers ───────────────────────────────────────────────────────────
export const storage = {
    getAccessToken: () => localStorage.getItem('askora_access_token'),
    getRefreshToken: () => localStorage.getItem('askora_refresh_token'),
    setTokens: (access: string, refresh: string) => {
        localStorage.setItem('askora_access_token', access)
        localStorage.setItem('askora_refresh_token', refresh)
    },
    setUser: (user: unknown) =>
        localStorage.setItem('askora_user', JSON.stringify(user)),
    getUser: () => {
        try {
            return JSON.parse(localStorage.getItem('askora_user') || 'null')
        } catch {
            return null
        }
    },
    clear: () => {
        localStorage.removeItem('askora_access_token')
        localStorage.removeItem('askora_refresh_token')
        localStorage.removeItem('askora_user')
    },
}

let isRefreshing = false
let failedQueue: Array<{
    resolve: (value: string) => void
    reject: (reason: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error)
        else prom.resolve(token as string)
    })
    failedQueue = []
}

// ── Request interceptor: attach access token ──────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = storage.getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// ── Response interceptor: silent token refresh on 401 ────────────────────────
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config

        const isAuthEndpoint =
            original?.url?.includes('/auth/login') ||
            original?.url?.includes('/auth/signup') ||
            original?.url?.includes('/auth/refresh')

        if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                })
                    .then((token) => {
                        original.headers.Authorization = `Bearer ${token}`
                        return api(original)
                    })
                    .catch((err) => Promise.reject(err))
            }

            original._retry = true
            isRefreshing = true

            const refreshToken = storage.getRefreshToken()
            if (!refreshToken) {
                storage.clear()
                window.location.href = '/login'
                return Promise.reject(error)
            }

            try {
                const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
                const { accessToken, refreshToken: newRefresh } = res.data.data
                storage.setTokens(accessToken, newRefresh)
                processQueue(null, accessToken)
                original.headers.Authorization = `Bearer ${accessToken}`
                return api(original)
            } catch (refreshError) {
                processQueue(refreshError, null)
                storage.clear()
                window.location.href = '/login'
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        return Promise.reject(error)
    }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
    signup: (data: {
        name: string
        email: string
        password: string
        organizationName: string
    }) => api.post('/auth/signup', data),

    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),

    refresh: (refreshToken: string) =>
        api.post('/auth/refresh', { refreshToken }),

    logout: () => api.post('/auth/logout'),

    getMe: () => api.get('/auth/me'),
}

// ── Users (admin only) ────────────────────────────────────────────────────────
export const usersApi = {
    getAll: () => api.get('/users'),

    add: (data: { name: string; email: string; password: string; role?: string }) =>
        api.post('/users', data),

    update: (id: string, data: Partial<{ name: string; email: string; isActive: boolean; role: string }>) =>
        api.put(`/users/${id}`, data),

    delete: (id: string) => api.delete(`/users/${id}`),
}

// ── Questions ─────────────────────────────────────────────────────────────────
export const questionsApi = {
    getAll: () => api.get('/questions'),

    getOne: (id: string) => api.get(`/questions/${id}`),

    getStats: (id: string) => api.get(`/questions/${id}/stats`),

    create: (data: { text: string; options: { text: string }[] }) =>
        api.post('/questions', data),

    update: (
        id: string,
        data: Partial<{ text: string; options: { text: string }[]; isActive: boolean }>
    ) => api.put(`/questions/${id}`, data),

    delete: (id: string) => api.delete(`/questions/${id}`),
}

// ── Responses ─────────────────────────────────────────────────────────────────
export const responsesApi = {
    getAll: () => api.get('/responses'),

    submit: (data: { questionId: string; selectedOptionId: string }) =>
        api.post('/responses', data),

    getForQuestion: (questionId: string) =>
        api.get(`/responses/question/${questionId}`),

    getMyResponse: (questionId: string) =>
        api.get(`/responses/my/${questionId}`),

    update: (responseId: string, data: { selectedOptionId: string }) =>
        api.put(`/responses/${responseId}`, data),
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatApi = {
    // Team chat
    getMessages: (params?: { limit?: number; before?: string }) =>
        api.get('/chat', { params }),

    sendMessage: (message: string) => api.post('/chat', { message }),

    markRead: (senderId?: string) => api.post('/chat/read', senderId ? { senderId } : {}),

    // Personal chat
    getPersonalMessages: (receiverId: string, params?: { limit?: number; before?: string }) =>
        api.get(`/chat/personal/${receiverId}`, { params }),

    sendPersonalMessage: (receiverId: string, message: string) =>
        api.post('/chat/personal', { receiverId, message }),

    getUnreadCounts: () => api.get('/chat/unread-counts'),
}

// ── Beams ─────────────────────────────────────────────────────────────────────
export const beamsApi = {
    getAuth: () => api.get('/beams/auth'),
}

export default api