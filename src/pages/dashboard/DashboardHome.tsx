import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { questionsApi, responsesApi, usersApi } from '../../services/api'
import { Question } from '../../types'
import { getSocket } from '../../services/socket'
import { HelpCircle, Users, MessageSquare, TrendingUp, Activity } from 'lucide-react'
import toast from 'react-hot-toast'

interface Stats {
    questions: number
    activeQuestions: number
    users: number
    responses: number
}

export default function DashboardHome() {
    const { user } = useAuth()
    const isAdmin = user?.role === 'admin'

    const [stats, setStats] = useState<Stats>({ questions: 0, activeQuestions: 0, users: 0, responses: 0 })
    const [recentQuestions, setRecentQuestions] = useState<Question[]>([])
    const [loading, setLoading] = useState(true)

    const loadData = useCallback(async () => {
        try {
            const qRes = await questionsApi.getAll()
            const questions: Question[] = qRes.data.data.questions
            setRecentQuestions(questions.slice(0, 5))

            let usersCount = 0
            let responsesCount = 0

            if (isAdmin) {
                const [uRes, rRes] = await Promise.all([usersApi.getAll(), responsesApi.getAll()])
                usersCount = uRes.data.data.users.length
                responsesCount = rRes.data.data.responses.length
            }

            setStats({
                questions: questions.length,
                activeQuestions: questions.filter((q) => q.isActive).length,
                users: usersCount,
                responses: responsesCount,
            })
        } catch {
            // Silently fail — data stays stale
        } finally {
            setLoading(false)
        }
    }, [isAdmin])

    useEffect(() => {
        loadData()

        const socket = getSocket()
        if (!socket) return

        const onNewQuestion = () => {
            toast('📋 A new question was added!', { icon: '✨' })
            loadData()
        }
        const onNewResponse = (data: { userName: string; selectedOptionText: string }) => {
            if (isAdmin) {
                toast(`${data.userName} responded: "${data.selectedOptionText}"`, { icon: '💬' })
                loadData()
            }
        }

        socket.on('question:new', onNewQuestion)
        socket.on('response:new', onNewResponse)

        return () => {
            socket.off('question:new', onNewQuestion)
            socket.off('response:new', onNewResponse)
        }
    }, [loadData, isAdmin])

    const greeting = (() => {
        const h = new Date().getHours()
        if (h < 12) return 'morning'
        if (h < 17) return 'afternoon'
        return 'evening'
    })()

    const statCards = [
        { icon: <HelpCircle size={20} />, label: 'Total Questions', value: stats.questions, color: '#6366f1' },
        { icon: <Activity size={20} />, label: 'Active Questions', value: stats.activeQuestions, color: '#22c55e' },
        ...(isAdmin
            ? [
                { icon: <Users size={20} />, label: 'Team Members', value: stats.users, color: '#f59e0b' },
                { icon: <MessageSquare size={20} />, label: 'Total Responses', value: stats.responses, color: '#a855f7' },
            ]
            : []),
    ]

    return (
        <div className="animate-fadein">
            {/* Header */}
            <div style={s.header}>
                <div>
                    <h1 style={s.title}>
                        Good {greeting}, {user?.name?.split(' ')[0]} 👋
                    </h1>
                    <p style={s.subtitle}>
                        {user?.organizationName} · {isAdmin ? 'Admin Dashboard' : 'User Dashboard'}
                    </p>
                </div>
                <div style={s.liveBadge}>
                    <span style={s.liveDot} />
                    Live
                </div>
            </div>

            {/* Stat Cards */}
            {loading ? (
                <div style={s.statsGrid}>
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} style={{ ...s.statCard, animation: 'pulse 1.5s ease-in-out infinite' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-elevated)' }} />
                            <div style={{ width: 60, height: 28, borderRadius: 6, background: 'var(--bg-elevated)', marginTop: 8 }} />
                            <div style={{ width: 100, height: 14, borderRadius: 4, background: 'var(--bg-elevated)', marginTop: 6 }} />
                        </div>
                    ))}
                </div>
            ) : (
                <div style={s.statsGrid}>
                    {statCards.map((c, i) => (
                        <div key={i} style={s.statCard} className="animate-fadein">
                            <div style={{ ...s.statIcon, background: c.color + '22', color: c.color }}>{c.icon}</div>
                            <div style={s.statValue}>{c.value}</div>
                            <div style={s.statLabel}>{c.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Recent Questions */}
            <div style={s.section}>
                <h2 style={s.sectionTitle}>
                    <TrendingUp size={18} />
                    Recent Questions
                </h2>

                {recentQuestions.length === 0 && !loading ? (
                    <div style={s.empty}>
                        <HelpCircle size={40} color="var(--text-muted)" />
                        <p style={{ color: 'var(--text-muted)' }}>
                            {isAdmin ? 'No questions yet — create your first one!' : 'No questions yet. Check back soon!'}
                        </p>
                    </div>
                ) : (
                    <div style={s.qList}>
                        {recentQuestions.map((q) => (
                            <div key={q._id} style={s.qCard}>
                                <div style={s.qMeta}>
                                    <span style={{
                                        ...s.statusPill,
                                        background: q.isActive ? 'var(--success-dim)' : 'var(--bg-elevated)',
                                        color: q.isActive ? 'var(--success)' : 'var(--text-muted)',
                                    }}>
                                        {q.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <span style={s.qDate}>{new Date(q.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p style={s.qText}>{q.text}</p>
                                <div style={s.optionChips}>
                                    {q.options.map((opt) => (
                                        <span key={opt._id} style={s.chip}>{opt.text}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

const s: Record<string, React.CSSProperties> = {
    header: {
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px',
    },
    title: { fontSize: '28px', fontWeight: 800, marginBottom: '6px' },
    subtitle: { color: 'var(--text-secondary)', fontSize: '14px' },
    liveBadge: {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px', borderRadius: '20px',
        background: 'var(--success-dim)', color: 'var(--success)',
        fontSize: '13px', fontWeight: 600,
    },
    liveDot: { width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)' },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '40px',
    },
    statCard: {
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '24px',
        display: 'flex', flexDirection: 'column',
    },
    statIcon: {
        width: '40px', height: '40px', borderRadius: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px',
    },
    statValue: { fontSize: '32px', fontWeight: 800, fontFamily: 'Syne, sans-serif', lineHeight: 1 },
    statLabel: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' },
    section: {},
    sectionTitle: {
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '18px', fontWeight: 700, marginBottom: '16px',
    },
    qList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    qCard: {
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '20px',
    },
    qMeta: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
    statusPill: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 },
    qDate: { fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' },
    qText: { fontWeight: 600, marginBottom: '12px', lineHeight: 1.5 },
    optionChips: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
    chip: {
        padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
        background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
        border: '1px solid var(--border)',
    },
    empty: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
        padding: '60px 20px',
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--border)',
    },
}