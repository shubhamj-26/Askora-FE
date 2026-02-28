import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from 'react'
import { User, AuthState } from '../types'
import { authApi, beamsApi } from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'
import { initBeams, stopBeams } from '../services/beams'

interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>
    signup: (
        name: string,
        email: string,
        password: string,
        organizationName: string
    ) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

// ── Side-effects after a successful auth ──────────────────────────────────────
// Connects socket and initialises Beams. Neither failure is fatal.
const setupRealtime = async (token: string, userId: string): Promise<void> => {
    // 1. Socket
    connectSocket(token)

    // 2. Pusher Beams (best-effort)
    try {
        const beamsRes = await beamsApi.getAuth()
        const { interests } = beamsRes.data.data as {
            beamsUserId: string
            interests: string[]
        }
        await initBeams({
            instanceId: import.meta.env.VITE_PUSHER_BEAMS_INSTANCE_ID || '',
            interests,
        })
    } catch {
        // Non-fatal — app works without push notifications
        console.warn('Beams setup skipped:', userId)
    }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<AuthState>({
        token: localStorage.getItem('askora_token'),
        user: (() => {
            try {
                return JSON.parse(localStorage.getItem('askora_user') || 'null')
            } catch {
                return null
            }
        })(),
        isAuthenticated: !!localStorage.getItem('askora_token'),
        isLoading: true,
    })

    // Validate stored token on mount
    useEffect(() => {
        const token = localStorage.getItem('askora_token')
        if (!token) {
            setState((prev) => ({ ...prev, isLoading: false }))
            return
        }

        authApi
            .getMe()
            .then((res) => {
                const user: User = res.data.data.user
                localStorage.setItem('askora_user', JSON.stringify(user))
                setState({ token, user, isAuthenticated: true, isLoading: false })
                setupRealtime(token, user.id)
            })
            .catch(() => {
                // Token invalid/expired — clean up
                localStorage.removeItem('askora_token')
                localStorage.removeItem('askora_user')
                setState({ token: null, user: null, isAuthenticated: false, isLoading: false })
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const persistAuth = useCallback((token: string, user: User) => {
        localStorage.setItem('askora_token', token)
        localStorage.setItem('askora_user', JSON.stringify(user))
        setState({ token, user, isAuthenticated: true, isLoading: false })
    }, [])

    const login = useCallback(
        async (email: string, password: string) => {
            const res = await authApi.login({ email, password })
            const { token, user } = res.data.data as { token: string; user: User }
            persistAuth(token, user)
            setupRealtime(token, user.id)
        },
        [persistAuth]
    )

    const signup = useCallback(
        async (
            name: string,
            email: string,
            password: string,
            organizationName: string
        ) => {
            const res = await authApi.signup({ name, email, password, organizationName })
            const { token, user } = res.data.data as { token: string; user: User }
            persistAuth(token, user)
            setupRealtime(token, user.id)
        },
        [persistAuth]
    )

    const logout = useCallback(async () => {
        try {
            await authApi.logout()
        } catch {
            // Ignore — we always clear local state
        }
        localStorage.removeItem('askora_token')
        localStorage.removeItem('askora_user')
        disconnectSocket()
        await stopBeams()
        setState({ token: null, user: null, isAuthenticated: false, isLoading: false })
    }, [])

    return (
        <AuthContext.Provider value={{ ...state, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextType => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
    return ctx
}