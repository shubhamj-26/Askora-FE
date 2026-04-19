import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5842'

let socket: Socket | null = null
let connectingToken: string | null = null  // prevents duplicate connections

export const connectSocket = (token: string): Socket => {
    // Already connected with same token — reuse
    if (socket?.connected && connectingToken === token) return socket

    // If connecting with same token (StrictMode double-call) — wait
    if (connectingToken === token && socket) return socket

    // Disconnect stale socket only if token changed
    if (socket && connectingToken !== token) {
        socket.disconnect()
        socket = null
    }

    connectingToken = token

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
        console.log('🔌 Socket connected:', socket?.id)
    })

    socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason)
        // Only clear connectingToken on intentional disconnect
        if (reason === 'io client disconnect') {
            connectingToken = null
        }
    })

    socket.on('connect_error', (err) => {
        console.warn('🔌 Socket connection error:', err.message)
    })

    return socket
}

export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect()
        socket = null
        connectingToken = null
    }
}

export const getSocket = (): Socket | null => socket