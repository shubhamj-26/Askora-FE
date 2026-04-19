import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    ReactNode,
} from 'react'
import { User, AuthState } from '../types'
import { authApi, beamsApi, storage } from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'
import { initBeams, stopBeams, requestNotificationPermission } from '../services/beams'

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

// ── Setup real-time (socket + pusher) ─────────────────────────────────────────
const setupRealtime = async (token: string): Promise<void> => {
    // 1. Socket
    connectSocket(token)

    // 2. Request notification permission proactively
    await requestNotificationPermission()

    // 3. Pusher Channels
    try {
        console.log('🔔 [SETUP] Setting up Pusher Channels notifications...')
        const beamsRes = await beamsApi.getAuth()
        const { interests } = beamsRes.data.data as {
            beamsUserId: string
            interests: string[]
        }
        console.log('📬 [SETUP] Pusher interests received:', interests)

        // Use VITE_PUSHER_KEY — the Channels app key, NOT the Beams instance ID
        await initBeams({
            instanceId: import.meta.env.VITE_PUSHER_KEY || '',
            interests,
        })
        console.log('✅ [SETUP] Pusher Channels initialized — real-time notifications active')
    } catch (err) {
        console.warn('⚠️ [SETUP] Pusher setup warning:', err instanceof Error ? err.message : String(err))
    }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<AuthState>({
        token: storage.getAccessToken(),
        user: storage.getUser(),
        isAuthenticated: !!storage.getAccessToken(),
        isLoading: true,
    })

    // Guard against StrictMode double-setup
    const realtimeSetupDone = useRef(false)

    useEffect(() => {
        const token = storage.getAccessToken()
        if (!token) {
            setState((prev) => ({ ...prev, isLoading: false }))
            return
        }

        authApi
            .getMe()
            .then((res) => {
                const user: User = res.data.data.user
                storage.setUser(user)
                setState({ token, user, isAuthenticated: true, isLoading: false })

                // Only set up realtime once (guard against StrictMode double-invoke)
                if (!realtimeSetupDone.current) {
                    realtimeSetupDone.current = true
                    setupRealtime(token)
                }
            })
            .catch(() => {
                storage.clear()
                setState({ token: null, user: null, isAuthenticated: false, isLoading: false })
            })

        return () => {
            // StrictMode cleanup — reset the guard so second mount can proceed
            realtimeSetupDone.current = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const persistAuth = useCallback((token: string, refreshToken: string, user: User) => {
        storage.setTokens(token, refreshToken)
        storage.setUser(user)
        setState({ token, user, isAuthenticated: true, isLoading: false })
    }, [])

    const login = useCallback(
        async (email: string, password: string) => {
            const res = await authApi.login({ email, password })
            const { token, refreshToken, user } = res.data.data as {
                token: string; refreshToken: string; user: User
            }
            persistAuth(token, refreshToken, user)
            realtimeSetupDone.current = true
            setupRealtime(token)
        },
        [persistAuth]
    )

    const signup = useCallback(
        async (name: string, email: string, password: string, organizationName: string) => {
            const res = await authApi.signup({ name, email, password, organizationName })
            const { token, refreshToken, user } = res.data.data as {
                token: string; refreshToken: string; user: User
            }
            persistAuth(token, refreshToken, user)
            realtimeSetupDone.current = true
            setupRealtime(token)
        },
        [persistAuth]
    )

    const logout = useCallback(async () => {
        try { await authApi.logout() } catch { /* ignore */ }
        storage.clear()
        disconnectSocket()
        await stopBeams()
        realtimeSetupDone.current = false
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