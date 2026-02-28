import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5842'

let socket: Socket | null = null

export const connectSocket = (token: string): Socket => {
    // If already connected with same token, reuse
    if (socket?.connected) return socket

    // Disconnect any stale socket before creating a new one
    if (socket) {
        socket.disconnect()
        socket = null
    }

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
    }
}

export const getSocket = (): Socket | null => socket