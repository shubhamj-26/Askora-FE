import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { questionsApi, responsesApi } from '../../services/api'
import { Question, UserResponse } from '../../types'
import { MessageSquare, CheckCircle } from 'lucide-react'

export default function ResponsesPage() {
    const { user } = useAuth()
    const isAdmin = user?.role === 'admin'

    const [loading, setLoading] = useState(true)
    // For admins: all responses + question map
    // For users: only their own responses
    const [responses, setResponses] = useState<UserResponse[]>([])
    const [questionMap, setQuestionMap] = useState<Record<string, Question>>({})

    const loadData = useCallback(async () => {
        try {
            if (isAdmin) {
                // Admin: GET /responses (all) + GET /questions (to map question text)
                const [rRes, qRes] = await Promise.all([responsesApi.getAll(), questionsApi.getAll()])
                const allResponses: UserResponse[] = rRes.data.data.responses
                const allQuestions: Question[] = qRes.data.data.questions

                const qMap: Record<string, Question> = {}
                allQuestions.forEach((q) => { qMap[q._id] = q })

                setResponses(allResponses)
                setQuestionMap(qMap)
            } else {
                // Regular user: fetch all questions first, then check their response for each
                const qRes = await questionsApi.getAll()
                const allQuestions: Question[] = qRes.data.data.questions

                const qMap: Record<string, Question> = {}
                allQuestions.forEach((q) => { qMap[q._id] = q })
                setQuestionMap(qMap)

                // GET /responses/my/:questionId  for each question — returns null if not answered
                const userResponses: UserResponse[] = []
                await Promise.allSettled(
                    allQuestions.map(async (q) => {
                        const r = await responsesApi.getMyResponse(q._id)
                        if (r.data.data.response) {
                            userResponses.push(r.data.data.response)
                        }
                    })
                )
                // Sort newest first
                userResponses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                setResponses(userResponses)
            }
        } catch {
            // Silent
        } finally {
            setLoading(false)
        }
    }, [isAdmin])

    useEffect(() => { loadData() }, [loadData])

    return (
        <div className="animate-fadein">
            <div style={s.pageHeader}>
                <div>
                    <h1 style={s.title}>{isAdmin ? 'All Responses' : 'My Responses'}</h1>
                    <p style={s.subtitle}>
                        {isAdmin
                            ? `${responses.length} total response${responses.length !== 1 ? 's' : ''} across all questions`
                            : `${responses.length} question${responses.length !== 1 ? 's' : ''} answered`}
                    </p>
                </div>
            </div>

            {loading ? (
                <div style={s.list}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} style={{ ...s.card, animation: 'pulse 1.5s ease-in-out infinite' }}>
                            <div style={{ height: 20, background: 'var(--bg-elevated)', borderRadius: 4, width: '60%' }} />
                            <div style={{ height: 14, background: 'var(--bg-elevated)', borderRadius: 4, width: '40%', marginTop: 10 }} />
                        </div>
                    ))}
                </div>
            ) : responses.length === 0 ? (
                <div style={s.empty}>
                    <MessageSquare size={48} color="var(--text-muted)" />
                    <p style={{ color: 'var(--text-muted)' }}>
                        {isAdmin
                            ? 'No responses submitted yet.'
                            : "You haven't answered any questions yet. Head to the Questions page!"}
                    </p>
                </div>
            ) : (
                <div style={s.list}>
                    {responses.map((r) => {
                        const question = questionMap[r.questionId]
                        return (
                            <div key={r._id} style={s.card}>
                                <div style={s.cardTop}>
                                    <div style={s.answeredBadge}>
                                        <CheckCircle size={14} />
                                        {isAdmin ? r.userName : 'Answered'}
                                    </div>
                                    <span style={s.date}>{new Date(r.createdAt).toLocaleDateString()}</span>
                                </div>

                                {/* Question text (from map) */}
                                <p style={s.qText}>
                                    {question ? question.text : `Question ID: ${r.questionId}`}
                                </p>

                                {/* Answer */}
                                <div style={s.answerRow}>
                                    {isAdmin && (
                                        <span style={s.byUser}>{r.userEmail}</span>
                                    )}
                                    <span style={s.answerLabel}>
                                        {isAdmin ? 'Selected:' : 'Your answer:'}
                                    </span>
                                    <span style={s.answerValue}>{r.selectedOptionText}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

const s: Record<string, React.CSSProperties> = {
    pageHeader: { marginBottom: '28px' },
    title: { fontSize: '28px', fontWeight: 800, marginBottom: '4px' },
    subtitle: { color: 'var(--text-secondary)', fontSize: '14px' },
    list: { display: 'flex', flexDirection: 'column', gap: '12px' },
    card: {
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '20px',
    },
    cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
    answeredBadge: {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '4px 12px', borderRadius: '20px',
        background: 'var(--success-dim)', color: 'var(--success)',
        fontSize: '12px', fontWeight: 600,
    },
    date: { fontSize: '12px', color: 'var(--text-muted)' },
    qText: { fontWeight: 600, marginBottom: '12px', fontSize: '15px', lineHeight: 1.5 },
    answerRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
    byUser: { fontSize: '12px', color: 'var(--text-muted)' },
    answerLabel: { fontSize: '13px', color: 'var(--text-secondary)' },
    answerValue: {
        padding: '4px 14px', borderRadius: '20px',
        background: 'var(--accent-dim)', color: 'var(--accent-light)',
        fontSize: '13px', fontWeight: 600,
    },
    empty: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
        padding: '80px 20px', background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)',
        textAlign: 'center',
    },
}