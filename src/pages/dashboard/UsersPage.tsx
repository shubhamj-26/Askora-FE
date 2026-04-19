import { useState, useEffect } from 'react'
import { usersApi } from '../../services/api'
import { User } from '../../types'
import toast from 'react-hot-toast'
import {
    Plus, UserX, UserCheck, Trash2, X,
    Eye, EyeOff, Users, Mail, Lock, User as UserIcon,
} from 'lucide-react'

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [showPass, setShowPass] = useState(false)
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })

    const loadUsers = async () => {
        try {
            const res = await usersApi.getAll()
            setUsers(res.data.data.users)
        } catch {
            toast.error('Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadUsers() }, [])

    const resetForm = () => {
        setForm({ name: '', email: '', password: '', role: 'user' })
        setShowForm(false)
    }

    const handleAddUser = async () => {
        if (!form.name.trim() || !form.email.trim() || !form.password) {
            toast.error('Name, email and password are required')
            return
        }
        if (form.password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }
        setSubmitting(true)
        try {
            await usersApi.add({ ...form, name: form.name.trim(), email: form.email.trim() })
            toast.success('User added successfully')
            resetForm()
            loadUsers()
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            toast.error(e.response?.data?.message || 'Failed to add user')
        } finally {
            setSubmitting(false)
        }
    }

    const handleToggleActive = async (u: User) => {
        try {
            await usersApi.update(u.id, { isActive: !u.isActive })
            toast.success(`User ${u.isActive ? 'deactivated' : 'activated'}`)
            loadUsers()
        } catch {
            toast.error('Failed to update user')
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this user permanently?')) return
        try {
            await usersApi.delete(id)
            toast.success('User deleted')
            loadUsers()
        } catch {
            toast.error('Failed to delete user')
        }
    }

    const adminCount = users.filter((u) => u.role === 'admin').length
    const activeCount = users.filter((u) => u.isActive).length

    return (
        <div className="animate-fadein">
            {/* Header */}
            <div style={s.pageHeader}>
                <div>
                    <h1 style={s.title}>Team Members</h1>
                    <p style={s.subtitle}>
                        {users.length} total · {activeCount} active · {adminCount} admin
                    </p>
                </div>
                <button onClick={() => setShowForm((v) => !v)} style={s.addBtn}>
                    <Plus size={16} /> Add User
                </button>
            </div>

            {/* Add User Form */}
            {showForm && (
                <div style={s.formCard} className="animate-fadein">
                    <div style={s.formHeader}>
                        <h3 style={s.formTitle}>Add New User</h3>
                        <button onClick={resetForm} style={s.iconBtn}><X size={18} /></button>
                    </div>
                    <div style={s.formBody}>
                        <div style={s.formGrid}>
                            {/* Name */}
                            <div style={s.fieldWrap}>
                                <label style={s.label}><UserIcon size={14} /> Full Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="John Doe"
                                    style={s.input}
                                />
                            </div>
                            {/* Email */}
                            <div style={s.fieldWrap}>
                                <label style={s.label}><Mail size={14} /> Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                    placeholder="john@company.com"
                                    style={s.input}
                                />
                            </div>
                            {/* Password */}
                            <div style={s.fieldWrap}>
                                <label style={s.label}><Lock size={14} /> Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                        placeholder="Min 6 characters"
                                        style={s.input}
                                    />
                                    <button type="button" onClick={() => setShowPass((v) => !v)} style={s.eyeBtn}>
                                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>
                            {/* Role */}
                            <div style={s.fieldWrap}>
                                <label style={s.label}><UserIcon size={14} /> Role</label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                                    style={s.input}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <div style={s.formActions}>
                            <button onClick={resetForm} style={s.cancelBtn}>Cancel</button>
                            <button onClick={handleAddUser} disabled={submitting} style={{ ...s.saveBtn, opacity: submitting ? 0.7 : 1 }}>
                                {submitting ? <span style={s.spinner} /> : <><Plus size={16} /> Add User</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Users table */}
            {loading ? (
                <div style={s.tableWrap}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} style={{ ...s.row, animation: 'pulse 1.5s ease-in-out infinite' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elevated)' }} />
                            <div style={{ flex: 1, height: 16, background: 'var(--bg-elevated)', borderRadius: 4, maxWidth: 200 }} />
                        </div>
                    ))}
                </div>
            ) : users.length === 0 ? (
                <div style={s.empty}>
                    <Users size={48} color="var(--text-muted)" />
                    <p style={{ color: 'var(--text-muted)' }}>No users yet. Add your first team member!</p>
                </div>
            ) : (
                <div style={s.tableWrap}>
                    <div style={s.tableHeader}>
                        <span>User</span>
                        <span>Role</span>
                        <span>Status</span>
                        <span>Joined</span>
                        <span>Actions</span>
                    </div>
                    {users.map((u) => (
                        <div key={u.id} style={s.row}>
                            <div style={s.userCell}>
                                <div style={s.avatar}>{u.name?.charAt(0).toUpperCase() ?? '?'}</div>
                                <div>
                                    <div style={s.userName}>{u.name}</div>
                                    <div style={s.userEmail}>{u.email}</div>
                                </div>
                            </div>
                            <span style={{
                                ...s.roleBadge,
                                background: u.role === 'admin' ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                                color: u.role === 'admin' ? 'var(--accent-light)' : 'var(--text-secondary)',
                            }}>
                                {u.role}
                            </span>
                            <span style={{
                                ...s.statusBadge,
                                background: u.isActive ? 'var(--success-dim)' : 'var(--bg-elevated)',
                                color: u.isActive ? 'var(--success)' : 'var(--text-muted)',
                            }}>
                                {u.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span style={s.dateText}>
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                            </span>
                            <div style={s.rowActions}>
                                <button
                                    onClick={() => handleToggleActive(u)}
                                    style={{ ...s.actionBtn, color: u.isActive ? 'var(--warning)' : 'var(--success)' }}
                                    title={u.isActive ? 'Deactivate' : 'Activate'}
                                >
                                    {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                                </button>
                                <button
                                    onClick={() => handleDelete(u.id)}
                                    style={{ ...s.actionBtn, color: 'var(--danger)' }}
                                    title="Delete user"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const s: Record<string, React.CSSProperties> = {
    pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' },
    title: { fontSize: '28px', fontWeight: 800, marginBottom: '4px' },
    subtitle: { color: 'var(--text-secondary)', fontSize: '14px' },
    addBtn: {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 18px', background: 'var(--gradient)', border: 'none',
        borderRadius: 'var(--radius-sm)', color: '#fff',
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
    },
    formCard: {
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', marginBottom: '24px', overflow: 'hidden',
    },
    formHeader: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: '1px solid var(--border)',
    },
    formTitle: { fontSize: '16px', fontWeight: 700 },
    iconBtn: { background: 'none', border: 'none', color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center' },
    formBody: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    fieldWrap: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: {
        display: 'flex', alignItems: 'center', gap: '5px',
        fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)',
    },
    input: {
        padding: '10px 14px', background: 'var(--bg-elevated)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)', fontSize: '14px', outline: 'none', width: '100%',
    },
    eyeBtn: {
        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
    },
    formActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
    cancelBtn: {
        padding: '10px 20px', background: 'var(--bg-elevated)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
        color: 'var(--text-secondary)', fontSize: '14px',
    },
    saveBtn: {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 20px', background: 'var(--gradient)', border: 'none',
        borderRadius: 'var(--radius-sm)', color: '#fff',
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
    },
    spinner: {
        width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block',
    },
    tableWrap: {
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    },
    tableHeader: {
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
        padding: '12px 20px', background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border)',
        fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
    },
    row: {
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
        padding: '14px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center',
    },
    userCell: { display: 'flex', alignItems: 'center', gap: '12px' },
    avatar: {
        width: '36px', height: '36px', borderRadius: '50%', background: 'var(--gradient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '14px', color: '#fff', flexShrink: 0,
    },
    userName: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' },
    userEmail: { fontSize: '12px', color: 'var(--text-muted)' },
    roleBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
    statusBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
    dateText: { fontSize: '13px', color: 'var(--text-secondary)' },
    rowActions: { display: 'flex', gap: '4px' },
    actionBtn: {
        background: 'none', border: 'none', padding: '6px',
        borderRadius: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'opacity 0.2s',
    },
    empty: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
        padding: '80px 20px', background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)',
    },
}