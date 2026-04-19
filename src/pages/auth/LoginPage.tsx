import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react'

export default function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(false)
    const [showPass, setShowPass] = useState(false)
    const [form, setForm] = useState({ email: '', password: '' })

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!form.email.trim() || !form.password) {
            toast.error('Email and password are required')
            return
        }
        setLoading(true)
        try {
            await login(form.email.trim(), form.password)
            toast.success('Welcome back!')
            navigate('/dashboard')
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            toast.error(e.response?.data?.message || 'Invalid credentials')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={s.page}>
            <div style={s.orb1} />
            <div style={s.orb2} />

            <div style={s.card} className="animate-fadein">
                {/* Logo */}
                <div style={s.logo}>
                    <div style={s.logoIcon}><Sparkles size={20} color="#fff" /></div>
                    <span style={s.logoText}>Askora</span>
                </div>

                <h1 style={s.title}>Welcome back</h1>
                <p style={s.subtitle}>Sign in to your organisation workspace</p>

                <form onSubmit={handleSubmit} style={s.form} noValidate>
                    {/* Email */}
                    <div style={s.fieldWrap}>
                        <label style={s.label}><Mail size={15} />Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            placeholder="you@company.com"
                            style={s.input}
                            autoComplete="email"
                        />
                    </div>

                    {/* Password */}
                    <div style={s.fieldWrap}>
                        <label style={s.label}><Lock size={15} />Password</label>
                        <div style={s.inputWrap}>
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={form.password}
                                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                placeholder="••••••••"
                                style={s.input}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass((v) => !v)}
                                style={s.eyeBtn}
                                aria-label="Toggle password visibility"
                            >
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }}>
                        {loading ? <span style={s.spinner} /> : 'Sign In'}
                    </button>
                </form>

                <p style={s.footer}>
                    Don't have an account?{' '}
                    <Link to="/signup">Create workspace</Link>
                </p>
            </div>
        </div>
    )
}

const s: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
    },
    orb1: {
        position: 'fixed',
        top: '-15%', left: '-10%',
        width: '500px', height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    orb2: {
        position: 'fixed',
        bottom: '-15%', right: '-10%',
        width: '600px', height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    card: {
        width: '100%',
        maxWidth: '420px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '40px',
        boxShadow: 'var(--shadow-lg)',
    },
    logo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' },
    logoIcon: {
        width: '36px', height: '36px', borderRadius: '10px',
        background: 'var(--gradient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    logoText: { fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 800 },
    title: { fontSize: '24px', fontWeight: 800, marginBottom: '8px' },
    subtitle: { color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' },
    form: { display: 'flex', flexDirection: 'column', gap: '18px' },
    fieldWrap: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: {
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)',
    },
    inputWrap: { position: 'relative' },
    input: {
        width: '100%', padding: '11px 16px',
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
        fontSize: '14px', outline: 'none',
    },
    eyeBtn: {
        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', color: 'var(--text-secondary)',
        display: 'flex', alignItems: 'center',
    },
    submitBtn: {
        marginTop: '8px', padding: '13px',
        background: 'var(--gradient)', border: 'none',
        borderRadius: 'var(--radius-sm)', color: '#fff',
        fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'opacity 0.2s',
    },
    spinner: {
        width: '18px', height: '18px',
        border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block',
    },
    footer: { marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' },
}