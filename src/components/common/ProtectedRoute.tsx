import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ReactNode } from 'react'

interface Props {
    children: ReactNode
    adminOnly?: boolean
}

export default function ProtectedRoute({ children, adminOnly = false }: Props) {
    const { isAuthenticated, user, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div style={styles.wrap}>
                <div style={styles.spinner} />
                <p style={styles.text}>Loading Askora…</p>
            </div>
        )
    }

    if (!isAuthenticated) return <Navigate to="/login" replace />
    if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" replace />

    return <>{children}</>
}

const styles: Record<string, React.CSSProperties> = {
    wrap: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        gap: '16px',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    text: {
        color: 'var(--text-secondary)',
        fontSize: '14px',
    },
}