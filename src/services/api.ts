import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5842/api'

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('askora_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// On 401 → clear storage and redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('askora_token')
            localStorage.removeItem('askora_user')
            window.location.href = '/login'
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

    logout: () => api.post('/auth/logout'),

    // GET /auth/me  →  { success, data: { user } }
    getMe: () => api.get('/auth/me'),
}

// ── Users (admin only) ────────────────────────────────────────────────────────
export const usersApi = {
    // GET /users  →  { success, data: { users } }
    getAll: () => api.get('/users'),

    // POST /users  →  { success, data: { user } }
    add: (data: { name: string; email: string; password: string; role?: string }) =>
        api.post('/users', data),

    // PUT /users/:id
    update: (
        id: string,
        data: Partial<{ name: string; isActive: boolean; role: string }>
    ) => api.put(`/users/${id}`, data),

    // DELETE /users/:id
    delete: (id: string) => api.delete(`/users/${id}`),
}

// ── Questions ─────────────────────────────────────────────────────────────────
export const questionsApi = {
    // GET /questions  →  { success, data: { questions } }
    getAll: () => api.get('/questions'),

    // GET /questions/:id  →  { success, data: { question } }
    getOne: (id: string) => api.get(`/questions/${id}`),

    // GET /questions/:id/stats  →  { success, data: { question, totalResponses, stats } }
    getStats: (id: string) => api.get(`/questions/${id}/stats`),

    // POST /questions  →  { success, data: { question } }
    create: (data: { text: string; options: { text: string }[] }) =>
        api.post('/questions', data),

    // PUT /questions/:id
    update: (
        id: string,
        data: Partial<{
            text: string
            options: { text: string }[]
            isActive: boolean
        }>
    ) => api.put(`/questions/${id}`, data),

    // DELETE /questions/:id
    delete: (id: string) => api.delete(`/questions/${id}`),
}

// ── Responses ─────────────────────────────────────────────────────────────────
export const responsesApi = {
    // GET /responses  (admin only)  →  { success, data: { responses } }
    getAll: () => api.get('/responses'),

    // POST /responses  →  { success, data: { response } }
    submit: (data: { questionId: string; selectedOptionId: string }) =>
        api.post('/responses', data),

    // GET /responses/question/:questionId  (admin only)  →  { success, data: { responses } }
    getForQuestion: (questionId: string) =>
        api.get(`/responses/question/${questionId}`),

    // GET /responses/my/:questionId  →  { success, data: { response } }  (null if not answered)
    getMyResponse: (questionId: string) =>
        api.get(`/responses/my/${questionId}`),
}

// ── Beams ─────────────────────────────────────────────────────────────────────
export const beamsApi = {
    // GET /beams/auth  →  { success, data: { beamsUserId, interests, ... } }
    getAuth: () => api.get('/beams/auth'),
}

export default api