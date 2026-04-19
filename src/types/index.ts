// Matches backend IUser shape returned in API responses
export interface User {
    id: string
    name: string
    email: string
    role: 'admin' | 'user'
    companyDbName: string
    organizationName: string
    isActive?: boolean
    createdAt?: string
    updatedAt?: string
}

// Matches backend IOption sub-document
export interface Option {
    _id: string
    text: string
    order: number
}

// Matches backend IQuestion document
export interface Question {
    _id: string
    text: string
    options: Option[]
    isActive: boolean
    createdBy: string
    companyDbName: string
    createdAt: string
    updatedAt: string
}

// Matches backend IResponse document
export interface UserResponse {
    _id: string
    questionId: string
    userId: string
    userEmail: string
    userName: string
    selectedOptionId: string
    selectedOptionText: string
    companyDbName: string
    createdAt: string
    updatedAt: string
}

// Stats shape from GET /questions/:id/stats
export interface QuestionStats {
    question: Question
    totalResponses: number
    stats: {
        optionId: string
        optionText: string
        count: number
        percentage: number
    }[]
}

// Auth state used in context
export interface AuthState {
    token: string | null
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
}

// API generic wrapper
export interface ApiResponse<T> {
    success: boolean
    message?: string
    data: T
}