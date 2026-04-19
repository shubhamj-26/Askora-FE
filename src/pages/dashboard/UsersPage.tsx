import { useState, useEffect } from 'react'
import { usersApi } from '../../services/api'
import { User } from '../../types'
import toast from 'react-hot-toast'
import ConfirmModal from '../../components/modals/ConfirmModal'
import {
    Plus, UserX, UserCheck, Trash2, X,
    Eye, EyeOff, Users, Mail, Lock, User as UserIcon, Pencil,
} from 'lucide-react'

interface EditForm {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddForm, setShowAddForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [showPass, setShowPass] = useState(false)
    const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'user' })

    // Edit state
    const [editForm, setEditForm] = useState<EditForm | null>(null)
    const [editSubmitting, setEditSubmitting] = useState(false)

    // Custom confirm modal state
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean
        userId: string
        userName: string
        loading: boolean
    }>({ open: false, userId: '', userName: '', loading: false })

    const loadUsers = async () => {
        try {
            const res = await usersApi.getAll()
            const userList = res.data.data.users || []
            // Validate each user has an id
            const validatedUsers = userList.map((u: User) => ({
                ...u,
                id: u.id || (u as any)._id // Fallback to _id if id doesn't exist
            }))
            setUsers(validatedUsers)
        } catch {
            toast.error('Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadUsers() }, [])

    const resetAddForm = () => {
        setAddForm({ name: '', email: '', password: '', role: 'user' })
        setShowAddForm(false)
        setShowPass(false)
    }

    // ── Add User ────────────────────────────────────────────────────────────────
    const handleAddUser = async () => {
        if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password) {
            toast.error('Name, email and password are required')
            return
        }
        if (addForm.password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }
        setSubmitting(true)
        try {
            await usersApi.add({ ...addForm, name: addForm.name.trim(), email: addForm.email.trim() })
            toast.success('User added successfully')
            resetAddForm()
            loadUsers()
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            toast.error(e.response?.data?.message || 'Failed to add user')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Edit User ───────────────────────────────────────────────────────────────
    const startEdit = (u: User) => {
        if (!u.id) { toast.error('Invalid user ID'); return }
        setEditForm({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive ?? true })
    }

    const handleEditSave = async () => {
        if (!editForm) return
        if (!editForm.id || editForm.id === 'undefined') {
            toast.error('Invalid user ID — cannot update')
            return
        }
        setEditSubmitting(true)
        try {
            await usersApi.update(editForm.id, {
                name: editForm.name,
                email: editForm.email,
                role: editForm.role,
                isActive: editForm.isActive,
            })
            toast.success('User updated')
            setEditForm(null)
            loadUsers()
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            toast.error(e.response?.data?.message || 'Failed to update user')
        } finally {
            setEditSubmitting(false)
        }
    }

    // ── Toggle Active (quick action) ────────────────────────────────────────────
    const handleToggleActive = async (u: User) => {
        if (!u.id) { toast.error('Invalid user ID'); return }
        try {
            await usersApi.update(u.id, { isActive: !u.isActive })
            toast.success(`User ${u.isActive ? 'deactivated' : 'activated'}`)
            loadUsers()
        } catch {
            toast.error('Failed to update user')
        }
    }

    // ── Delete ──────────────────────────────────────────────────────────────────
    const requestDelete = (u: User) => {
        if (!u.id) { toast.error('Invalid user ID'); return }
        setConfirmModal({ open: true, userId: u.id, userName: u.name, loading: false })
    }

    const handleDeleteConfirm = async () => {
        setConfirmModal((m) => ({ ...m, loading: true }))
        try {
            await usersApi.delete(confirmModal.userId)
            toast.success('User deleted')
            setConfirmModal({ open: false, userId: '', userName: '', loading: false })
            loadUsers()
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            toast.error(e.response?.data?.message || 'Failed to delete user')
            setConfirmModal((m) => ({ ...m, loading: false }))
        }
    }

    const adminCount = users.filter((u) => u.role === 'admin').length
    const activeCount = users.filter((u) => u.isActive).length

    return (
        <div className="animate-fadein">
            {/* Delete confirm modal */}
            <ConfirmModal
                isOpen={confirmModal.open}
                title="Delete User"
                message={
                    <>
                        Are you sure you want to permanently delete{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>{confirmModal.userName}</strong>?
                        This action cannot be undone.
                    </>
                }
                confirmLabel="Delete"
                variant="danger"
                loading={confirmModal.loading}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setConfirmModal({ open: false, userId: '', userName: '', loading: false })}
            />

            {/* Edit modal */}
            {editForm && (
                <div style={s.overlay} onClick={() => setEditForm(null)}>
                    <div style={s.editModal} onClick={(e) => e.stopPropagation()} className="animate-fadein">
                        <div style={s.modalHeader}>
                            <h3 style={s.modalTitle}>Edit User</h3>
                            <button onClick={() => setEditForm(null)} style={s.iconBtn}><X size={18} /></button>
                        </div>
                        <div style={s.modalBody}>
                            <div style={s.fieldWrap}>
                                <label style={s.label}><UserIcon size={14} /> Full Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm((f) => f ? { ...f, name: e.target.value } : f)}
                                    style={s.input}
                                />
                            </div>
                            <div style={s.fieldWrap}>
                                <label style={s.label}><Mail size={14} /> Email</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm((f) => f ? { ...f, email: e.target.value } : f)}
                                    style={s.input}
                                />
                            </div>
                            <div style={s.fieldWrap}>
                                <label style={s.label}><UserIcon size={14} /> Role</label>
                                <select
                                    value={editForm.role}
                                    onChange={(e) => setEditForm((f) => f ? { ...f, role: e.target.value } : f)}
                                    style={s.input}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div style={s.fieldWrap}>
                                <label style={s.label}>Status</label>
                                <div style={s.toggleRow}>
                                    <button
                                        onClick={() => setEditForm((f) => f ? { ...f, isActive: true } : f)}
                                        style={{
                                            ...s.toggleBtn,
                                            background: editForm.isActive ? 'var(--success-dim)' : 'var(--bg-elevated)',
                                            color: editForm.isActive ? 'var(--success)' : 'var(--text-secondary)',
                                            border: `1px solid ${editForm.isActive ? 'var(--success)' : 'var(--border)'}`,
                                        }}
                                    >
                                        Active
                                    </button>
                                    <button
                                        onClick={() => setEditForm((f) => f ? { ...f, isActive: false } : f)}
                                        style={{
                                            ...s.toggleBtn,
                                            background: !editForm.isActive ? 'var(--danger-dim)' : 'var(--bg-elevated)',
                                            color: !editForm.isActive ? 'var(--danger)' : 'var(--text-secondary)',
                                            border: `1px solid ${!editForm.isActive ? 'var(--danger)' : 'var(--border)'}`,
                                        }}
                                    >
                                        Inactive
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div style={s.modalActions}>
                            <button onClick={() => setEditForm(null)} style={s.cancelBtn}>Cancel</button>
                            <button
                                onClick={handleEditSave}
                                disabled={editSubmitting}
                                style={{ ...s.saveBtn, opacity: editSubmitting ? 0.7 : 1 }}
                            >
                                {editSubmitting ? <span style={s.spinner} /> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={s.pageHeader}>
                <div>
                    <h1 style={s.title}>Team Members</h1>
                    <p style={s.subtitle}>{users.length} total · {activeCount} active · {adminCount} admin</p>
                </div>
                <button onClick={() => setShowAddForm((v) => !v)} style={s.addBtn}>
                    <Plus size={16} /> Add User
                </button>
            </div>

            {/* Add User Form */}
            {showAddForm && (
                <div style={s.formCard} className="animate-fadein">
                    <div style={s.formHeader}>
                        <h3 style={s.formTitle}>Add New User</h3>
                        <button onClick={resetAddForm} style={s.iconBtn}><X size={18} /></button>
                    </div>
                    <div style={s.formBody}>
                        <div style={s.formGrid}>
                            <div style={s.fieldWrap}>
                                <label style={s.label}><UserIcon size={14} /> Full Name</label>
                                <input type="text" value={addForm.name}
                                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="John Doe" style={s.input} />
                            </div>
                            <div style={s.fieldWrap}>
                                <label style={s.label}><Mail size={14} /> Email</label>
                                <input type="email" value={addForm.email}
                                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                                    placeholder="john@company.com" style={s.input} />
                            </div>
                            <div style={s.fieldWrap}>
                                <label style={s.label}><Lock size={14} /> Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPass ? 'text' : 'password'} value={addForm.password}
                                        onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                                        placeholder="Min 6 characters" style={s.input} />
                                    <button type="button" onClick={() => setShowPass((v) => !v)} style={s.eyeBtn}>
                                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div style={s.fieldWrap}>
                                <label style={s.label}><UserIcon size={14} /> Role</label>
                                <select value={addForm.role}
                                    onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                                    style={s.input}>
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <div style={s.formActions}>
                            <button onClick={resetAddForm} style={s.cancelBtn}>Cancel</button>
                            <button onClick={handleAddUser} disabled={submitting}
                                style={{ ...s.saveBtn, opacity: submitting ? 0.7 : 1 }}>
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
                            <div style={{ flex: 1, height: 16, background: 'var(--bg-elevated)', borderRadius: 4 }} />
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
                                    onClick={() => startEdit(u)}
                                    style={s.actionBtn}
                                    title="Edit user"
                                >
                                    <Pencil size={15} />
                                </button>
                                <button
                                    onClick={() => handleToggleActive(u)}
                                    style={{ ...s.actionBtn, color: u.isActive ? 'var(--warning)' : 'var(--success)' }}
                                    title={u.isActive ? 'Deactivate' : 'Activate'}
                                >
                                    {u.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                                </button>
                                <button
                                    onClick={() => requestDelete(u)}
                                    style={{ ...s.actionBtn, color: 'var(--danger)' }}
                                    title="Delete user"
                                >
                                    <Trash2 size={15} />
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
    overlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 999, padding: '16px',
    },
    editModal: {
        width: '100%', maxWidth: '440px', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        overflow: 'hidden', boxShadow: 'var(--shadow-lg)',
    },
    modalHeader: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
    },
    modalTitle: { fontSize: '16px', fontWeight: 700 },
    modalBody: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
    modalActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '0 20px 20px' },
    toggleRow: { display: 'flex', gap: '8px' },
    toggleBtn: {
        flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
        fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
    },
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
    label: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' },
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
    userName: { fontSize: '14px', fontWeight: 600 },
    userEmail: { fontSize: '12px', color: 'var(--text-muted)' },
    roleBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
    statusBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
    dateText: { fontSize: '13px', color: 'var(--text-secondary)' },
    rowActions: { display: 'flex', gap: '4px' },
    actionBtn: {
        background: 'none', border: 'none', padding: '6px', borderRadius: '6px',
        display: 'flex', alignItems: 'center', cursor: 'pointer',
        color: 'var(--text-secondary)', transition: 'opacity 0.2s',
    },
    empty: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
        padding: '80px 20px', background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)',
    },
}