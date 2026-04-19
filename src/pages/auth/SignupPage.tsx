import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { Building2, Mail, Lock, User, Eye, EyeOff, Sparkles, Info } from 'lucide-react'

export default function SignupPage() {
    const { signup } = useAuth()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(false)
    const [showPass, setShowPass] = useState(false)
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        organizationName: '',
    })

    // Derive DB name preview — e.g. ndsofttech_com
    const emailDomain = form.email.includes('@') ? form.email.split('@')[1] : ''
    const dbPreview = emailDomain ? emailDomain.replace(/\./g, '_') : ''

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        const { name, email, password, organizationName } = form

        if (!name.trim() || !email.trim() || !password || !organizationName.trim()) {
            toast.error('All fields are required')
            return
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        setLoading(true)
        try {
            await signup(name.trim(), email.trim(), password, organizationName.trim())
            toast.success('Workspace created! Welcome to Askora 🎉')
            navigate('/dashboard')
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            toast.error(e.response?.data?.message || 'Signup failed. Please try again.')
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

                <h1 style={s.title}>Create Organization/Workspace</h1>
                <p style={s.subtitle}>
                    Set up your organization workspace and become the admin.
                </p>

                {/* Info banner */}
                <div style={s.infoBanner}>
                    <Info size={15} color="var(--accent-light)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={s.infoText}>
                        <strong>Sign up is used to create a new Organization/Workspace only.</strong> If your organization workspace already exists, ask your workspace admin to create a user account for you — <strong>do not sign up here</strong>.
                    </span>
                </div>

                <form onSubmit={handleSubmit} style={s.form} noValidate>
                    {/* Full Name */}
                    <FormField
                        icon={<User size={15} />}
                        label="Full Name"
                        type="text"
                        value={form.name}
                        onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                        placeholder="Shubham Jadhav"
                    />

                    {/* Organisation */}
                    <FormField
                        icon={<Building2 size={15} />}
                        label="Organisation / Workspace Name"
                        type="text"
                        value={form.organizationName}
                        onChange={(v) => setForm((f) => ({ ...f, organizationName: v }))}
                        placeholder="NDSoftTech Solutions"
                    />

                    {/* Admin Email */}
                    <FormField
                        icon={<Mail size={15} />}
                        label="Admin Email"
                        type="email"
                        value={form.email}
                        onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                        placeholder="shubham.jadhav@ndsofttech.com"
                    />

                    {/* DB preview */}
                    {dbPreview && (
                        <div style={s.dbPreview}>
                            <div style={s.dbRow}>
                                <span style={s.dbLabel}>✓ Your Organization/Workspace will be created</span>
                            </div>
                            <div style={s.dbRow}>
                                <span style={s.dbLabel}>✓ A dedicated database will be set up as:</span>
                                <code style={s.dbCode}>{dbPreview}</code>
                            </div>
                            <div style={s.dbRow}>
                                <span style={{ ...s.dbLabel, fontSize: '11px', color: 'var(--text-muted)' }}>
                                    (derived from your email domain: <strong style={{ color: 'var(--text-secondary)' }}>{emailDomain}</strong>)
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Password */}
                    <div style={s.fieldWrap}>
                        <label style={s.label}>
                            <Lock size={15} />
                            Password
                        </label>
                        <div style={s.inputWrap}>
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={form.password}
                                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                placeholder="Min 6 characters"
                                style={s.input}
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

                    <button
                        type="submit"
                        disabled={loading}
                        style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? <span style={s.spinner} /> : 'Create Organisation & Workspace'}
                    </button>
                </form>

                <p style={s.footer}>
                    Already have an account?{' '}
                    <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    )
}

function FormField({
    icon, label, type, value, onChange, placeholder,
}: {
    icon: React.ReactNode
    label: string
    type: string
    value: string
    onChange: (v: string) => void
    placeholder: string
}) {
    return (
        <div style={s.fieldWrap}>
            <label style={s.label}>{icon}{label}</label>
            <div style={s.inputWrap}>
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    style={s.input}
                    autoComplete="off"
                />
            </div>
        </div>
    )
}

const s: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', position: 'relative', overflow: 'hidden', background: 'var(--bg-primary)',
    },
    orb1: {
        position: 'fixed', top: '-20%', right: '-10%', width: '600px', height: '600px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    orb2: {
        position: 'fixed', bottom: '-20%', left: '-10%', width: '500px', height: '500px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    card: {
        width: '100%', maxWidth: '460px', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)',
        padding: '40px', position: 'relative', boxShadow: 'var(--shadow-lg)',
    },
    logo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' },
    logoIcon: {
        width: '36px', height: '36px', borderRadius: '10px', background: 'var(--gradient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    logoText: { fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 800 },
    title: { fontSize: '22px', fontWeight: 800, marginBottom: '6px' },
    subtitle: { color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' },
    infoBanner: {
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '12px 14px', background: 'var(--accent-dim)',
        border: '1px solid rgba(99,102,241,0.25)', borderRadius: 'var(--radius-sm)',
        marginBottom: '24px',
    },
    infoText: { fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 },
    form: { display: 'flex', flexDirection: 'column', gap: '16px' },
    fieldWrap: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: {
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)',
    },
    inputWrap: { position: 'relative' },
    input: {
        width: '100%', padding: '11px 16px', background: 'var(--bg-elevated)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
    },
    eyeBtn: {
        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', color: 'var(--text-secondary)',
        display: 'flex', alignItems: 'center',
    },
    dbPreview: {
        padding: '12px 14px', background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.25)',
        display: 'flex', flexDirection: 'column', gap: '6px',
    },
    dbRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
    dbLabel: { fontSize: '12px', color: 'var(--text-secondary)' },
    dbCode: {
        fontSize: '12px', fontFamily: 'monospace',
        color: 'var(--accent-light)', fontWeight: 600,
        background: 'rgba(99,102,241,0.12)', padding: '2px 8px', borderRadius: '4px',
    },
    submitBtn: {
        marginTop: '8px', padding: '13px', background: 'var(--gradient)',
        border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff',
        fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s',
    },
    spinner: {
        width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block',
    },
    footer: { marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' },
}