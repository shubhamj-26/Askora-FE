import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { questionsApi, responsesApi } from '../../services/api'
import { Question, UserResponse } from '../../types'
import { getSocket } from '../../services/socket'
import toast from 'react-hot-toast'
import ConfirmModal from '../../components/modals/ConfirmModal'
import {
    Plus, Pencil, Trash2, CheckCircle, Circle,
    ChevronDown, ChevronUp, Save, X, HelpCircle, RefreshCw,
} from 'lucide-react'

interface QuestionForm {
    text: string
    options: string[]
}

export default function QuestionsPage() {
    const { user } = useAuth()
    const isAdmin = user?.role === 'admin'

    const [questions, setQuestions] = useState<Question[]>([])
    const [myResponses, setMyResponses] = useState<Record<string, UserResponse>>({})
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [form, setForm] = useState<QuestionForm>({ text: '', options: ['', ''] })
    const [submitting, setSubmitting] = useState(false)
    const [respondingId, setRespondingId] = useState<string | null>(null)
    // Track which question is in "edit response" mode
    const [editingResponseQId, setEditingResponseQId] = useState<string | null>(null)

    // Custom confirm modal for question delete
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean; questionId: string; loading: boolean
    }>({ open: false, questionId: '', loading: false })

    // ── Load ───────────────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        try {
            const qRes = await questionsApi.getAll()
            const qs: Question[] = qRes.data.data.questions
            setQuestions(qs)

            if (!isAdmin) {
                const responseMap: Record<string, UserResponse> = {}
                await Promise.allSettled(
                    qs.map(async (q) => {
                        const r = await responsesApi.getMyResponse(q._id)
                        if (r.data.data.response) responseMap[q._id] = r.data.data.response
                    })
                )
                setMyResponses(responseMap)
            }
        } catch {
            // silent
        } finally {
            setLoading(false)
        }
    }, [isAdmin])

    useEffect(() => {
        loadData()
        const socket = getSocket()
        if (!socket) return
        socket.on('question:new', loadData)
        socket.on('question:updated', loadData)
        socket.on('question:deleted', loadData)
        socket.on('response:new', loadData)
        socket.on('response:updated', loadData)
        return () => {
            socket.off('question:new', loadData)
            socket.off('question:updated', loadData)
            socket.off('question:deleted', loadData)
            socket.off('response:new', loadData)
            socket.off('response:updated', loadData)
        }
    }, [loadData])

    // ── Form helpers ───────────────────────────────────────────────────────────
    const resetForm = () => {
        setForm({ text: '', options: ['', ''] })
        setEditId(null)
        setShowForm(false)
    }

    const startEdit = (q: Question) => {
        setForm({ text: q.text, options: q.options.map((o) => o.text) })
        setEditId(q._id)
        setShowForm(true)
        setExpandedId(null)
    }

    const addOption = () => {
        if (form.options.length < 6)
            setForm((f) => ({ ...f, options: [...f.options, ''] }))
    }

    const removeOption = (idx: number) => {
        if (form.options.length > 2)
            setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))
    }

    // ── CRUD ───────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!form.text.trim()) { toast.error('Question text is required'); return }
        const valid = form.options.filter((o) => o.trim())
        if (valid.length < 2) { toast.error('At least 2 options are required'); return }

        setSubmitting(true)
        try {
            const payload = { text: form.text.trim(), options: valid.map((text) => ({ text })) }
            if (editId) {
                await questionsApi.update(editId, payload)
                toast.success('Question updated')
            } else {
                await questionsApi.create(payload)
                toast.success('Question created')
            }
            resetForm()
            loadData()
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            toast.error(e.response?.data?.message || 'Failed to save question')
        } finally {
            setSubmitting(false)
        }
    }

    const requestDelete = (id: string) => setConfirmModal({ open: true, questionId: id, loading: false })

    const handleDeleteConfirm = async () => {
        setConfirmModal((m) => ({ ...m, loading: true }))
        try {
            await questionsApi.delete(confirmModal.questionId)
            toast.success('Question deleted')
            setConfirmModal({ open: false, questionId: '', loading: false })
            loadData()
        } catch {
            toast.error('Failed to delete question')
            setConfirmModal((m) => ({ ...m, loading: false }))
        }
    }

    const handleToggleActive = async (q: Question) => {
        try {
            await questionsApi.update(q._id, { isActive: !q.isActive })
            toast.success(q.isActive ? 'Question deactivated' : 'Question activated')
            loadData()
        } catch { toast.error('Failed to update') }
    }

    // ── Submit answer ──────────────────────────────────────────────────────────
    const handleRespond = async (questionId: string, optionId: string) => {
        setRespondingId(optionId)
        try {
            await responsesApi.submit({ questionId, selectedOptionId: optionId })
            toast.success('Response submitted ✅')
            setEditingResponseQId(null)
            loadData()
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            toast.error(e.response?.data?.message || 'Failed to submit')
        } finally {
            setRespondingId(null)
        }
    }

    // ── Edit existing response ─────────────────────────────────────────────────
    const handleEditResponse = async (questionId: string, optionId: string) => {
        const existing = myResponses[questionId]
        if (!existing) return
        setRespondingId(optionId)
        try {
            await responsesApi.update(existing._id, { selectedOptionId: optionId })
            toast.success('Response updated ✅')
            setEditingResponseQId(null)
            loadData()
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            toast.error(e.response?.data?.message || 'Failed to update response')
        } finally {
            setRespondingId(null)
        }
    }

    return (
        <div className="animate-fadein">
            {/* Delete confirm modal */}
            <ConfirmModal
                isOpen={confirmModal.open}
                title="Delete Question"
                message="Are you sure you want to permanently delete this question? All responses will also be removed."
                confirmLabel="Delete"
                variant="danger"
                loading={confirmModal.loading}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setConfirmModal({ open: false, questionId: '', loading: false })}
            />

            {/* Page header */}
            <div style={s.pageHeader}>
                <div>
                    <h1 style={s.title}>Questions</h1>
                    <p style={s.subtitle}>{questions.length} total · All members can answer</p>
                </div>
                {isAdmin && (
                    <button onClick={() => { resetForm(); setShowForm((v) => !v) }} style={s.addBtn}>
                        <Plus size={16} /> Add Question
                    </button>
                )}
            </div>

            {/* Create / Edit Form */}
            {showForm && isAdmin && (
                <div style={s.formCard} className="animate-fadein">
                    <div style={s.formHeader}>
                        <h3 style={s.formTitle}>{editId ? 'Edit Question' : 'New Question'}</h3>
                        <button onClick={resetForm} style={s.iconBtn}><X size={18} /></button>
                    </div>
                    <div style={s.formBody}>
                        <div style={s.fieldWrap}>
                            <label style={s.label}>Question Text</label>
                            <textarea
                                value={form.text}
                                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                                placeholder="What would you like for lunch?"
                                style={s.textarea}
                                rows={3}
                            />
                        </div>
                        <div style={s.fieldWrap}>
                            <label style={s.label}>Options (min 2, max 6)</label>
                            <div style={s.optionsList}>
                                {form.options.map((opt, i) => (
                                    <div key={i} style={s.optionRow}>
                                        <span style={s.optionNum}>{i + 1}</span>
                                        <input
                                            type="text" value={opt}
                                            onChange={(e) => {
                                                const opts = [...form.options]; opts[i] = e.target.value
                                                setForm((f) => ({ ...f, options: opts }))
                                            }}
                                            placeholder={`Option ${i + 1}`} style={s.optionInput}
                                        />
                                        {form.options.length > 2 && (
                                            <button onClick={() => removeOption(i)} style={s.removeBtn}><X size={14} /></button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {form.options.length < 6 && (
                                <button onClick={addOption} style={s.addOptionBtn}>
                                    <Plus size={14} /> Add Option
                                </button>
                            )}
                        </div>
                        <div style={s.formActions}>
                            <button onClick={resetForm} style={s.cancelBtn}>Cancel</button>
                            <button onClick={handleSubmit} disabled={submitting}
                                style={{ ...s.saveBtn, opacity: submitting ? 0.7 : 1 }}>
                                {submitting ? <span style={s.spinner} /> : <><Save size={16} /> Save Question</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Questions list */}
            {loading ? (
                <div style={s.list}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} style={{ ...s.qCard, animation: 'pulse 1.5s ease-in-out infinite' }}>
                            <div style={{ height: 20, background: 'var(--bg-elevated)', borderRadius: 4, width: '60%' }} />
                            <div style={{ height: 14, background: 'var(--bg-elevated)', borderRadius: 4, width: '40%', marginTop: 10 }} />
                        </div>
                    ))}
                </div>
            ) : questions.length === 0 ? (
                <div style={s.empty}>
                    <HelpCircle size={48} color="var(--text-muted)" />
                    <p style={{ color: 'var(--text-muted)' }}>
                        {isAdmin ? 'No questions yet — create your first one!' : 'No questions available.'}
                    </p>
                </div>
            ) : (
                <div style={s.list}>
                    {questions.map((q) => {
                        const myResponse = myResponses[q._id]
                        const isExpanded = expandedId === q._id
                        const isEditingResponse = editingResponseQId === q._id
                        const canRespond = !isAdmin && q.isActive && !myResponse
                        const canEditResponse = !isAdmin && !!myResponse && q.isActive

                        return (
                            <div key={q._id} style={{
                                ...s.qCard,
                                borderColor: myResponse ? 'rgba(34,197,94,0.3)' : 'var(--border)',
                            }}>
                                <div style={s.cardTop}>
                                    <div style={s.pillRow}>
                                        <span style={{
                                            ...s.statusPill,
                                            background: q.isActive ? 'var(--success-dim)' : 'var(--bg-elevated)',
                                            color: q.isActive ? 'var(--success)' : 'var(--text-muted)',
                                        }}>
                                            {q.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        {myResponse && !isEditingResponse && (
                                            <span style={s.answeredPill}>
                                                <CheckCircle size={12} /> Answered
                                            </span>
                                        )}
                                        {isEditingResponse && (
                                            <span style={s.editingPill}>
                                                <RefreshCw size={12} /> Editing response…
                                            </span>
                                        )}
                                    </div>
                                    <div style={s.actions}>
                                        {isAdmin && (
                                            <>
                                                <button onClick={() => handleToggleActive(q)} style={s.actionBtn}
                                                    title={q.isActive ? 'Deactivate' : 'Activate'}>
                                                    {q.isActive ? <Circle size={15} /> : <CheckCircle size={15} />}
                                                </button>
                                                <button onClick={() => startEdit(q)} style={s.actionBtn} title="Edit">
                                                    <Pencil size={15} />
                                                </button>
                                                <button onClick={() => requestDelete(q._id)}
                                                    style={{ ...s.actionBtn, color: 'var(--danger)' }} title="Delete">
                                                    <Trash2 size={15} />
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => setExpandedId(isExpanded ? null : q._id)} style={s.actionBtn}>
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <p style={s.qText}>{q.text}</p>
                                <p style={s.qInfo}>
                                    {q.options.length} option{q.options.length !== 1 ? 's' : ''} · {new Date(q.createdAt).toLocaleDateString()}
                                </p>

                                {isExpanded && (
                                    <div style={s.optionsExpanded} className="animate-fadein">
                                        {q.options.map((opt) => {
                                            const isSelected = myResponse?.selectedOptionId === opt._id
                                            const isSubmitting = respondingId === opt._id
                                            const clickable = (canRespond || isEditingResponse) && !isSubmitting

                                            return (
                                                <button
                                                    key={opt._id}
                                                    disabled={!clickable}
                                                    onClick={() => {
                                                        if (!clickable) return
                                                        if (isEditingResponse) {
                                                            handleEditResponse(q._id, opt._id)
                                                        } else if (canRespond) {
                                                            handleRespond(q._id, opt._id)
                                                        }
                                                    }}
                                                    style={{
                                                        ...s.optionBtn,
                                                        background: isSelected ? 'var(--success-dim)' : 'var(--bg-elevated)',
                                                        borderColor: isSelected ? 'var(--success)' : isEditingResponse ? 'var(--accent)' : 'var(--border)',
                                                        color: isSelected ? 'var(--success)' : 'var(--text-primary)',
                                                        cursor: clickable ? 'pointer' : 'default',
                                                        opacity: isSubmitting ? 0.6 : 1,
                                                    }}
                                                >
                                                    <span style={s.optionOrder}>{opt.order}.</span>
                                                    {opt.text}
                                                    {isSelected && !isEditingResponse && (
                                                        <CheckCircle size={16} style={{ marginLeft: 'auto', flexShrink: 0 }} />
                                                    )}
                                                    {isSubmitting && <span style={s.miniSpinner} />}
                                                </button>
                                            )
                                        })}

                                        {/* Status notes */}
                                        {!isAdmin && myResponse && !isEditingResponse && (
                                            <div style={s.responseNoteRow}>
                                                <p style={s.responseNote}>
                                                    ✅ Your answer: <strong>{myResponse.selectedOptionText}</strong>
                                                </p>
                                                {canEditResponse && (
                                                    <button
                                                        onClick={() => setEditingResponseQId(q._id)}
                                                        style={s.editResponseBtn}
                                                    >
                                                        <Pencil size={13} /> Change answer
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {isEditingResponse && (
                                            <div style={s.responseNoteRow}>
                                                <p style={s.editingNote}>
                                                    Select a new option above to change your answer.
                                                </p>
                                                <button
                                                    onClick={() => setEditingResponseQId(null)}
                                                    style={s.cancelEditBtn}
                                                >
                                                    <X size={13} /> Cancel
                                                </button>
                                            </div>
                                        )}
                                        {!isAdmin && !myResponse && !q.isActive && (
                                            <p style={s.inactiveNote}>This question is currently inactive.</p>
                                        )}
                                        {isAdmin && (
                                            <p style={s.adminNote}>Admins can manage but not answer questions.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
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
        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
        background: 'var(--gradient)', border: 'none', borderRadius: 'var(--radius-sm)',
        color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
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
    fieldWrap: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' },
    textarea: {
        padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', resize: 'vertical',
    },
    optionsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
    optionRow: { display: 'flex', alignItems: 'center', gap: '8px' },
    optionNum: {
        width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-dim)',
        color: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 700, flexShrink: 0,
    },
    optionInput: {
        flex: 1, padding: '10px 14px', background: 'var(--bg-elevated)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
    },
    removeBtn: {
        background: 'var(--danger-dim)', border: 'none', borderRadius: '6px',
        color: 'var(--danger)', padding: '7px', display: 'flex', alignItems: 'center',
    },
    addOptionBtn: {
        display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px',
        padding: '8px 14px', background: 'var(--bg-elevated)',
        border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)',
        color: 'var(--text-secondary)', fontSize: '13px',
    },
    formActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
    cancelBtn: {
        padding: '10px 20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '14px',
    },
    saveBtn: {
        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
        background: 'var(--gradient)', border: 'none', borderRadius: 'var(--radius-sm)',
        color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
    },
    spinner: {
        width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block',
    },
    miniSpinner: {
        width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.25)',
        borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        display: 'inline-block', marginLeft: 'auto', flexShrink: 0,
    },
    list: { display: 'flex', flexDirection: 'column', gap: '12px' },
    qCard: {
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '20px', transition: 'border-color 0.2s',
    },
    cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' },
    pillRow: { display: 'flex', alignItems: 'center', gap: '8px' },
    statusPill: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 },
    answeredPill: {
        display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px',
        borderRadius: '20px', fontSize: '12px', fontWeight: 600,
        background: 'var(--success-dim)', color: 'var(--success)',
    },
    editingPill: {
        display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px',
        borderRadius: '20px', fontSize: '12px', fontWeight: 600,
        background: 'var(--accent-dim)', color: 'var(--accent-light)',
    },
    actions: { display: 'flex', alignItems: 'center', gap: '4px' },
    actionBtn: {
        background: 'none', border: 'none', color: 'var(--text-secondary)',
        padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.2s',
    },
    qText: { fontWeight: 600, fontSize: '16px', marginBottom: '6px' },
    qInfo: { fontSize: '12px', color: 'var(--text-muted)' },
    optionsExpanded: { marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
    optionBtn: {
        display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
        borderRadius: 'var(--radius-sm)', border: '1px solid', fontSize: '14px',
        fontWeight: 500, textAlign: 'left', transition: 'all 0.2s', width: '100%',
    },
    optionOrder: { fontWeight: 700, color: 'var(--text-muted)', minWidth: '20px', flexShrink: 0 },
    responseNoteRow: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', marginTop: '4px', flexWrap: 'wrap',
    },
    responseNote: {
        padding: '10px 14px', borderRadius: 'var(--radius-sm)',
        background: 'var(--success-dim)', color: 'var(--success)', fontSize: '13px', flex: 1,
    },
    editResponseBtn: {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 14px', background: 'var(--accent-dim)',
        border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-sm)',
        color: 'var(--accent-light)', fontSize: '12px', fontWeight: 600, flexShrink: 0,
    },
    editingNote: {
        padding: '10px 14px', borderRadius: 'var(--radius-sm)',
        background: 'var(--accent-dim)', color: 'var(--accent-light)', fontSize: '13px', flex: 1,
    },
    cancelEditBtn: {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 14px', background: 'var(--bg-elevated)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
        color: 'var(--text-secondary)', fontSize: '12px', flexShrink: 0,
    },
    inactiveNote: {
        padding: '10px 14px', borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '13px',
    },
    adminNote: {
        padding: '8px 14px', borderRadius: 'var(--radius-sm)',
        background: 'var(--accent-dim)', color: 'var(--accent-light)', fontSize: '12px',
    },
    empty: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
        padding: '80px 20px', background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)',
    },
}