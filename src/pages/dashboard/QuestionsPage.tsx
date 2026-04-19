import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { questionsApi, responsesApi } from '../../services/api'
import { Question, UserResponse } from '../../types'
import { getSocket } from '../../services/socket'
import toast from 'react-hot-toast'
import {
    Plus, Pencil, Trash2, CheckCircle, Circle,
    ChevronDown, ChevronUp, Save, X, HelpCircle,
} from 'lucide-react'

interface QuestionForm {
    text: string
    options: string[]
}

export default function QuestionsPage() {
    const { user } = useAuth()
    const isAdmin = user?.role === 'admin'

    const [questions, setQuestions] = useState<Question[]>([])
    // Map of questionId → the user's submitted response
    const [myResponses, setMyResponses] = useState<Record<string, UserResponse>>({})
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [form, setForm] = useState<QuestionForm>({ text: '', options: ['', ''] })
    const [submitting, setSubmitting] = useState(false)
    const [respondingId, setRespondingId] = useState<string | null>(null) // optionId being submitted

    // ── Load data ──────────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        try {
            const qRes = await questionsApi.getAll()
            const qs: Question[] = qRes.data.data.questions
            setQuestions(qs)

            // For regular users, fetch their response for each question individually
            // using GET /responses/my/:questionId  (available to all authenticated users)
            if (!isAdmin) {
                const responseMap: Record<string, UserResponse> = {}
                await Promise.allSettled(
                    qs.map(async (q) => {
                        const r = await responsesApi.getMyResponse(q._id)
                        if (r.data.data.response) {
                            responseMap[q._id] = r.data.data.response
                        }
                    })
                )
                setMyResponses(responseMap)
            }
        } catch {
            // Silent
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

        return () => {
            socket.off('question:new', loadData)
            socket.off('question:updated', loadData)
            socket.off('question:deleted', loadData)
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
        if (form.options.length < 6) {
            setForm((f) => ({ ...f, options: [...f.options, ''] }))
        }
    }

    const removeOption = (idx: number) => {
        if (form.options.length > 2) {
            setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))
        }
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

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this question permanently?')) return
        try {
            await questionsApi.delete(id)
            toast.success('Question deleted')
            loadData()
        } catch {
            toast.error('Failed to delete')
        }
    }

    const handleToggleActive = async (q: Question) => {
        try {
            await questionsApi.update(q._id, { isActive: !q.isActive })
            toast.success(q.isActive ? 'Question deactivated' : 'Question activated')
            loadData()
        } catch {
            toast.error('Failed to update question')
        }
    }

    // ── Submit answer (users only) ─────────────────────────────────────────────
    const handleRespond = async (questionId: string, optionId: string) => {
        setRespondingId(optionId)
        try {
            await responsesApi.submit({ questionId, selectedOptionId: optionId })
            toast.success('Response submitted ✅')
            loadData()
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } }
            toast.error(e.response?.data?.message || 'Failed to submit response')
        } finally {
            setRespondingId(null)
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="animate-fadein">
            {/* Page header */}
            <div style={s.pageHeader}>
                <div>
                    <h1 style={s.title}>Questions</h1>
                    <p style={s.subtitle}>
                        {isAdmin
                            ? `${questions.length} question${questions.length !== 1 ? 's' : ''} total`
                            : 'Answer the questions below'}
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => { resetForm(); setShowForm((v) => !v) }}
                        style={s.addBtn}
                    >
                        <Plus size={16} />
                        Add Question
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
                        {/* Question text */}
                        <div style={s.fieldWrap}>
                            <label style={s.label}>Question Text</label>
                            <textarea
                                value={form.text}
                                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                                placeholder="What do you want for the team lunch?"
                                style={s.textarea}
                                rows={3}
                            />
                        </div>

                        {/* Options */}
                        <div style={s.fieldWrap}>
                            <label style={s.label}>Options (min 2, max 6)</label>
                            <div style={s.optionsList}>
                                {form.options.map((opt, i) => (
                                    <div key={i} style={s.optionRow}>
                                        <span style={s.optionNum}>{i + 1}</span>
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => {
                                                const opts = [...form.options]
                                                opts[i] = e.target.value
                                                setForm((f) => ({ ...f, options: opts }))
                                            }}
                                            placeholder={`Option ${i + 1}`}
                                            style={s.optionInput}
                                        />
                                        {form.options.length > 2 && (
                                            <button onClick={() => removeOption(i)} style={s.removeBtn}>
                                                <X size={14} />
                                            </button>
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
                            <button onClick={handleSubmit} disabled={submitting} style={{ ...s.saveBtn, opacity: submitting ? 0.7 : 1 }}>
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
                        {isAdmin ? 'No questions yet — create your first one!' : 'No questions available right now.'}
                    </p>
                </div>
            ) : (
                <div style={s.list}>
                    {questions.map((q) => {
                        const myResponse = myResponses[q._id]
                        const isExpanded = expandedId === q._id
                        // A user can respond if: they're not admin, question is active, they haven't responded yet
                        const canRespond = !isAdmin && q.isActive && !myResponse

                        return (
                            <div
                                key={q._id}
                                style={{
                                    ...s.qCard,
                                    borderColor: myResponse ? 'rgba(34,197,94,0.3)' : 'var(--border)',
                                }}
                            >
                                {/* Card top row */}
                                <div style={s.cardTop}>
                                    <div style={s.pillRow}>
                                        <span style={{
                                            ...s.statusPill,
                                            background: q.isActive ? 'var(--success-dim)' : 'var(--bg-elevated)',
                                            color: q.isActive ? 'var(--success)' : 'var(--text-muted)',
                                        }}>
                                            {q.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        {myResponse && (
                                            <span style={s.answeredPill}>
                                                <CheckCircle size={12} /> Answered
                                            </span>
                                        )}
                                    </div>
                                    <div style={s.actions}>
                                        {isAdmin && (
                                            <>
                                                <button
                                                    onClick={() => handleToggleActive(q)}
                                                    style={s.actionBtn}
                                                    title={q.isActive ? 'Deactivate' : 'Activate'}
                                                >
                                                    {q.isActive ? <Circle size={15} /> : <CheckCircle size={15} />}
                                                </button>
                                                <button onClick={() => startEdit(q)} style={s.actionBtn} title="Edit">
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(q._id)}
                                                    style={{ ...s.actionBtn, color: 'var(--danger)' }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : q._id)}
                                            style={s.actionBtn}
                                            title={isExpanded ? 'Collapse' : 'Expand'}
                                        >
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <p style={s.qText}>{q.text}</p>
                                <p style={s.qInfo}>
                                    {q.options.length} option{q.options.length !== 1 ? 's' : ''} ·{' '}
                                    {new Date(q.createdAt).toLocaleDateString()}
                                </p>

                                {/* Expanded options */}
                                {isExpanded && (
                                    <div style={s.optionsExpanded} className="animate-fadein">
                                        {q.options.map((opt) => {
                                            const isSelected = myResponse?.selectedOptionId === opt._id
                                            const isSubmitting = respondingId === opt._id

                                            return (
                                                <button
                                                    key={opt._id}
                                                    disabled={!canRespond || isSubmitting}
                                                    onClick={() => canRespond && handleRespond(q._id, opt._id)}
                                                    style={{
                                                        ...s.optionBtn,
                                                        background: isSelected ? 'var(--success-dim)' : 'var(--bg-elevated)',
                                                        borderColor: isSelected ? 'var(--success)' : 'var(--border)',
                                                        color: isSelected ? 'var(--success)' : 'var(--text-primary)',
                                                        cursor: canRespond && !isSubmitting ? 'pointer' : 'default',
                                                        opacity: isSubmitting ? 0.6 : 1,
                                                    }}
                                                >
                                                    <span style={s.optionOrder}>{opt.order}.</span>
                                                    {opt.text}
                                                    {isSelected && <CheckCircle size={16} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                                                    {isSubmitting && <span style={s.miniSpinner} />}
                                                </button>
                                            )
                                        })}

                                        {/* Status messages below options */}
                                        {!isAdmin && myResponse && (
                                            <p style={s.responseNote}>
                                                ✅ You selected: <strong>{myResponse.selectedOptionText}</strong>
                                            </p>
                                        )}
                                        {!isAdmin && !myResponse && !q.isActive && (
                                            <p style={s.inactiveNote}>This question is currently inactive.</p>
                                        )}
                                        {isAdmin && (
                                            <p style={s.adminNote}>Admins can view but not answer questions.</p>
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

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
    pageHeader: {
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px',
    },
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
    fieldWrap: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' },
    textarea: {
        padding: '12px 16px', background: 'var(--bg-elevated)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)', fontSize: '14px', outline: 'none', resize: 'vertical',
    },
    optionsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
    optionRow: { display: 'flex', alignItems: 'center', gap: '8px' },
    optionNum: {
        width: '28px', height: '28px', borderRadius: '50%',
        background: 'var(--accent-dim)', color: 'var(--accent-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 700, flexShrink: 0,
    },
    optionInput: {
        flex: 1, padding: '10px 14px',
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
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
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
        background: 'var(--success-dim)', color: 'var(--success)',
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
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 16px', borderRadius: 'var(--radius-sm)',
        border: '1px solid', fontSize: '14px', fontWeight: 500, textAlign: 'left',
        transition: 'all 0.2s', width: '100%',
    },
    optionOrder: { fontWeight: 700, color: 'var(--text-muted)', minWidth: '20px', flexShrink: 0 },
    responseNote: {
        marginTop: '4px', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
        background: 'var(--success-dim)', color: 'var(--success)', fontSize: '13px',
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