import { ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
    isOpen: boolean
    title: string
    message: string | ReactNode
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'warning' | 'info'
    onConfirm: () => void
    onCancel: () => void
    loading?: boolean
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
    loading = false,
}: ConfirmModalProps) {
    if (!isOpen) return null

    const colors = {
        danger: { icon: 'var(--danger)', iconBg: 'var(--danger-dim)', btn: '#ef4444' },
        warning: { icon: 'var(--warning)', iconBg: 'var(--warning-dim)', btn: '#f59e0b' },
        info: { icon: 'var(--accent)', iconBg: 'var(--accent-dim)', btn: 'var(--accent)' },
    }[variant]

    return (
        <div style={s.overlay} onClick={onCancel}>
            <div style={s.modal} onClick={(e) => e.stopPropagation()} className="animate-fadein">
                {/* Header */}
                <div style={s.header}>
                    <div style={{ ...s.iconWrap, background: colors.iconBg }}>
                        <AlertTriangle size={22} color={colors.icon} />
                    </div>
                    <button onClick={onCancel} style={s.closeBtn} disabled={loading}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div style={s.body}>
                    <h3 style={s.title}>{title}</h3>
                    <p style={s.message}>{message}</p>
                </div>

                {/* Actions */}
                <div style={s.actions}>
                    <button onClick={onCancel} disabled={loading} style={s.cancelBtn}>
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        style={{ ...s.confirmBtn, background: colors.btn, opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? <span style={s.spinner} /> : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

const s: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
    },
    modal: {
        width: '100%',
        maxWidth: '400px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 20px 0',
    },
    iconWrap: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: '4px',
    },
    body: {
        padding: '20px 20px',
    },
    title: {
        fontSize: '16px',
        fontWeight: 700,
        marginBottom: '8px',
    },
    message: {
        fontSize: '14px',
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
    },
    actions: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        padding: '16px 20px',
        borderTop: '1px solid var(--border)',
    },
    cancelBtn: {
        padding: '10px 16px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500,
        transition: 'all 0.2s',
    },
    confirmBtn: {
        padding: '10px 16px',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500,
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    spinner: {
        display: 'inline-block',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        animation: 'spin 0.8s linear infinite',
    },
}
