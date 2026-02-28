import { useState, useEffect, useCallback } from 'react'
import { questionsApi, responsesApi } from '../../services/api'
import { Question, UserResponse, QuestionStats } from '../../types'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts'
import { BarChart3, Users, MessageSquare, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4']

export default function AnalyticsPage() {
    const [questions, setQuestions] = useState<Question[]>([])
    const [responses, setResponses] = useState<UserResponse[]>([])
    const [selectedQId, setSelectedQId] = useState<string>('')
    const [statsData, setStatsData] = useState<QuestionStats | null>(null)
    const [loadingStats, setLoadingStats] = useState(false)
    const [loading, setLoading] = useState(true)

    // Load summary data
    useEffect(() => {
        const load = async () => {
            try {
                const [qRes, rRes] = await Promise.all([questionsApi.getAll(), responsesApi.getAll()])
                setQuestions(qRes.data.data.questions)
                setResponses(rRes.data.data.responses)
            } catch {
                toast.error('Failed to load analytics data')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    // Load per-question stats when a question is selected
    const loadStats = useCallback(async (id: string) => {
        if (!id) { setStatsData(null); return }
        setLoadingStats(true)
        try {
            const res = await questionsApi.getStats(id)
            setStatsData(res.data.data)
        } catch {
            toast.error('Failed to load question stats')
        } finally {
            setLoadingStats(false)
        }
    }, [])

    const handleSelectQ = (id: string) => {
        setSelectedQId(id)
        loadStats(id)
    }

    // ── Derived numbers ────────────────────────────────────────────────────────
    const totalResponses = responses.length
    const totalQuestions = questions.length
    const uniqueResponders = new Set(responses.map((r) => r.userId)).size
    const avgPerQ = totalQuestions
        ? Math.round((totalResponses / totalQuestions) * 10) / 10
        : 0

    const statCards = [
        { icon: <BarChart3 size={20} />, label: 'Total Questions', value: totalQuestions, color: '#6366f1' },
        { icon: <MessageSquare size={20} />, label: 'Total Responses', value: totalResponses, color: '#22c55e' },
        { icon: <Users size={20} />, label: 'Unique Responders', value: uniqueResponders, color: '#f59e0b' },
        { icon: <TrendingUp size={20} />, label: 'Avg Responses / Q', value: avgPerQ, color: '#a855f7' },
    ]

    // Bar chart: responses per question
    const barData = questions.map((q) => ({
        name: q.text.length > 30 ? q.text.slice(0, 30) + '…' : q.text,
        Responses: responses.filter((r) => r.questionId === q._id).length,
    }))

    // Pie chart: from stats API
    const pieData = statsData
        ? statsData.stats.map((s) => ({ name: s.optionText, value: s.count }))
        : []

    if (loading) {
        return (
            <div style={s.loadingWrap}>
                <div style={s.bigSpinner} />
                <p style={{ color: 'var(--text-secondary)' }}>Loading analytics…</p>
            </div>
        )
    }

    return (
        <div className="animate-fadein">
            <div style={s.pageHeader}>
                <h1 style={s.title}>Analytics</h1>
                <p style={s.subtitle}>Organisation-wide response insights</p>
            </div>

            {/* Stat cards */}
            <div style={s.statsGrid}>
                {statCards.map((c, i) => (
                    <div key={i} style={s.statCard}>
                        <div style={{ ...s.statIcon, background: c.color + '22', color: c.color }}>{c.icon}</div>
                        <div style={s.statValue}>{c.value}</div>
                        <div style={s.statLabel}>{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Bar chart */}
            <div style={s.chartCard}>
                <h3 style={s.chartTitle}>Responses per Question</h3>
                {barData.length === 0 ? (
                    <div style={s.noData}>No data yet</div>
                ) : (
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={barData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: '#8b91a0', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#8b91a0', fontSize: 11 }} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{
                                    background: '#1c2028', border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: '8px', color: '#f0f2f7',
                                }}
                            />
                            <Bar dataKey="Responses" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Option breakdown via stats API */}
            <div style={s.chartCard}>
                <div style={s.chartHeader}>
                    <h3 style={s.chartTitle}>Option Breakdown</h3>
                    <select
                        value={selectedQId}
                        onChange={(e) => handleSelectQ(e.target.value)}
                        style={s.select}
                    >
                        <option value="">— Select a question —</option>
                        {questions.map((q) => (
                            <option key={q._id} value={q._id}>
                                {q.text.length > 65 ? q.text.slice(0, 65) + '…' : q.text}
                            </option>
                        ))}
                    </select>
                </div>

                {!selectedQId ? (
                    <div style={s.noData}>Select a question to see its option breakdown</div>
                ) : loadingStats ? (
                    <div style={s.noData}><span style={s.bigSpinner} /></div>
                ) : pieData.every((d) => d.value === 0) ? (
                    <div style={s.noData}>No responses yet for this question</div>
                ) : (
                    <>
                        {/* Stats bar breakdown */}
                        <div style={s.statsBreakdown}>
                            {statsData?.stats.map((st) => (
                                <div key={st.optionId} style={s.statRow}>
                                    <span style={s.optionName}>{st.optionText}</span>
                                    <div style={s.barTrack}>
                                        <div style={{ ...s.barFill, width: `${st.percentage}%` }} />
                                    </div>
                                    <span style={s.statCount}>{st.count} ({st.percentage}%)</span>
                                </div>
                            ))}
                            <p style={s.totalNote}>
                                Total responses: <strong>{statsData?.totalResponses}</strong>
                            </p>
                        </div>

                        {/* Pie */}
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {pieData.map((_, idx) => (
                                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: '#1c2028', border: '1px solid rgba(255,255,255,0.07)',
                                        borderRadius: '8px', color: '#f0f2f7',
                                    }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </>
                )}
            </div>

            {/* Recent responses table */}
            {responses.length > 0 && (
                <div style={s.chartCard}>
                    <h3 style={s.chartTitle}>Recent Responses</h3>
                    <div style={s.tableWrap}>
                        <div style={s.tableHead}>
                            <span>User</span>
                            <span>Question</span>
                            <span>Answer</span>
                            <span>Date</span>
                        </div>
                        {responses.slice(0, 20).map((r) => {
                            const q = questions.find((q) => q._id === r.questionId)
                            return (
                                <div key={r._id} style={s.tableRow}>
                                    <div style={s.userCell}>
                                        <div style={s.avatar}>{r.userName?.charAt(0).toUpperCase() ?? '?'}</div>
                                        <div>
                                            <div style={s.userName}>{r.userName}</div>
                                            <div style={s.userEmail}>{r.userEmail}</div>
                                        </div>
                                    </div>
                                    <span style={s.cellText}>
                                        {q ? (q.text.length > 40 ? q.text.slice(0, 40) + '…' : q.text) : '—'}
                                    </span>
                                    <span style={s.answerBadge}>{r.selectedOptionText}</span>
                                    <span style={s.dateText}>{new Date(r.createdAt).toLocaleDateString()}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

const s: Record<string, React.CSSProperties> = {
    loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '100px 0' },
    bigSpinner: {
        width: '32px', height: '32px', border: '3px solid var(--border)',
        borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    },
    pageHeader: { marginBottom: '28px' },
    title: { fontSize: '28px', fontWeight: 800, marginBottom: '4px' },
    subtitle: { color: 'var(--text-secondary)', fontSize: '14px' },
    statsGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '16px', marginBottom: '24px',
    },
    statCard: {
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px',
    },
    statIcon: {
        width: '40px', height: '40px', borderRadius: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px',
    },
    statValue: { fontSize: '28px', fontWeight: 800, fontFamily: 'Syne, sans-serif', lineHeight: 1 },
    statLabel: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' },
    chartCard: {
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '20px',
    },
    chartHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
    chartTitle: { fontSize: '16px', fontWeight: 700, marginBottom: '20px' },
    select: {
        padding: '8px 12px', background: 'var(--bg-elevated)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)', fontSize: '13px', outline: 'none', maxWidth: '320px',
    },
    noData: {
        padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    statsBreakdown: { marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
    statRow: { display: 'flex', alignItems: 'center', gap: '12px' },
    optionName: { fontSize: '13px', fontWeight: 500, minWidth: '120px', color: 'var(--text-primary)' },
    barTrack: { flex: 1, height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' },
    barFill: { height: '100%', background: 'var(--gradient)', borderRadius: '4px', transition: 'width 0.6s ease' },
    statCount: { fontSize: '12px', color: 'var(--text-secondary)', minWidth: '80px', textAlign: 'right' },
    totalNote: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' },
    tableWrap: { overflow: 'hidden', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' },
    tableHead: {
        display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr',
        padding: '10px 16px', background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border)',
        fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
    },
    tableRow: {
        display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr',
        padding: '12px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center',
    },
    userCell: { display: 'flex', alignItems: 'center', gap: '10px' },
    avatar: {
        width: '30px', height: '30px', borderRadius: '50%', background: 'var(--gradient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '12px', color: '#fff', flexShrink: 0,
    },
    userName: { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' },
    userEmail: { fontSize: '11px', color: 'var(--text-muted)' },
    cellText: { fontSize: '13px', color: 'var(--text-secondary)' },
    answerBadge: {
        padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
        background: 'var(--accent-dim)', color: 'var(--accent-light)', display: 'inline-block',
    },
    dateText: { fontSize: '12px', color: 'var(--text-muted)' },
}