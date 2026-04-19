import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { chatApi, usersApi } from '../../services/api'
import { getSocket } from '../../services/socket'
import toast from 'react-hot-toast'
import { Send, MessageSquare, Users, Hash } from 'lucide-react'
import { User } from '../../types'

interface ChatMessage {
    _id: string
    senderId: string
    senderName: string
    senderEmail: string
    receiverId?: string
    receiverName?: string
    message: string
    createdAt: string
    chatType: 'team' | 'personal'
}

interface UserWithStatus extends User {
    isOnline?: boolean
    lastSeen?: string
    unreadCount?: number
}

export default function ChatPage() {
    const { user } = useAuth()
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const [chatType, setChatType] = useState<'team' | 'personal'>('team')
    const [selectedUser, setSelectedUser] = useState<UserWithStatus | null>(null)
    const [teamUsers, setTeamUsers] = useState<UserWithStatus[]>([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
    const bottomRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    // Ref to track current chat context inside socket callbacks
    const chatContextRef = useRef({ chatType: 'team' as 'team' | 'personal', selectedUserId: null as string | null })

    const scrollToBottom = (smooth = true) => {
        bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
    }

    // Keep ref in sync
    useEffect(() => {
        chatContextRef.current = {
            chatType,
            selectedUserId: selectedUser?.id || null,
        }
    }, [chatType, selectedUser])

    // ── Load team users + unread counts ───────────────────────────────────────
    const loadTeamUsers = useCallback(async () => {
        try {
            setLoadingUsers(true)
            const [usersRes, unreadRes] = await Promise.all([
                usersApi.getAll(),
                chatApi.getUnreadCounts(),
            ])
            const users: User[] = usersRes.data.data.users || []
            const counts: Record<string, number> = unreadRes.data.data.unreadCounts || {}
            setUnreadCounts(counts)
            const filtered = users
                .filter((u) => u.id !== user?.id)
                .map((u) => ({ ...u, unreadCount: counts[u.id] || 0 })) as UserWithStatus[]
            setTeamUsers(filtered)
        } catch (err) {
            console.error('Failed to load team users:', err)
        } finally {
            setLoadingUsers(false)
        }
    }, [user?.id])

    // ── Load team messages ─────────────────────────────────────────────────────
    const loadTeamMessages = useCallback(async () => {
        setLoading(true)
        try {
            const res = await chatApi.getMessages({ limit: 50 })
            setMessages(res.data.data.messages)
            setTimeout(() => scrollToBottom(false), 50)
            chatApi.markRead().catch(() => { })
        } catch {
            toast.error('Failed to load messages')
        } finally {
            setLoading(false)
        }
    }, [])

    // ── Load personal messages ─────────────────────────────────────────────────
    const loadPersonalMessages = useCallback(async (receiverId: string) => {
        setLoading(true)
        try {
            const res = await chatApi.getPersonalMessages(receiverId, { limit: 50 })
            setMessages(res.data.data.messages)
            setTimeout(() => scrollToBottom(false), 50)
            await chatApi.markRead(receiverId)
            setUnreadCounts((prev) => ({ ...prev, [receiverId]: 0 }))
            setTeamUsers((prev) =>
                prev.map((u) => u.id === receiverId ? { ...u, unreadCount: 0 } : u)
            )
        } catch {
            toast.error('Failed to load personal messages')
        } finally {
            setLoading(false)
        }
    }, [])

    // ── Socket setup (once on mount) ───────────────────────────────────────────
    useEffect(() => {
        loadTeamMessages()
        loadTeamUsers()

        const socket = getSocket()
        if (!socket) return

        socket.emit('chat:enter')

        // ── Team message ──
        const onTeamMessage = (msg: ChatMessage) => {
            if (chatContextRef.current.chatType === 'team') {
                setMessages((prev) => {
                    // Deduplicate (optimistic messages have temp_ prefix)
                    if (prev.some((m) => m._id === msg._id)) return prev
                    return [...prev, msg]
                })
                setTimeout(() => scrollToBottom(), 80)
                chatApi.markRead().catch(() => { })
            }
        }

        // ── Personal message (from personal room) ──
        const onPersonalMessage = (msg: ChatMessage) => {
            const ctx = chatContextRef.current
            const isCurrentConvo =
                ctx.chatType === 'personal' &&
                ctx.selectedUserId &&
                (msg.senderId === ctx.selectedUserId || msg.receiverId === ctx.selectedUserId)

            if (isCurrentConvo) {
                setMessages((prev) => {
                    // Replace optimistic message if exists
                    const hasOptimistic = prev.some(
                        (m) => m._id.startsWith('temp_') && m.message === msg.message && m.senderId === msg.senderId
                    )
                    if (hasOptimistic) {
                        return prev.map((m) =>
                            m._id.startsWith('temp_') && m.message === msg.message && m.senderId === msg.senderId
                                ? msg
                                : m
                        )
                    }
                    if (prev.some((m) => m._id === msg._id)) return prev
                    return [...prev, msg]
                })
                setTimeout(() => scrollToBottom(), 80)
                if (msg.senderId !== user?.id) {
                    chatApi.markRead(msg.senderId).catch(() => { })
                }
            } else if (msg.senderId !== user?.id) {
                // Update unread badge for other conversations
                setUnreadCounts((prev) => ({
                    ...prev,
                    [msg.senderId]: (prev[msg.senderId] || 0) + 1,
                }))
                setTeamUsers((prev) =>
                    prev.map((u) =>
                        u.id === msg.senderId
                            ? { ...u, unreadCount: (u.unreadCount || 0) + 1 }
                            : u
                    )
                )
            }
        }

        // ── Personal notification (user room — for when not in that convo) ──
        const onPersonalNotify = (data: { from: { id: string; name: string }; message: ChatMessage }) => {
            const ctx = chatContextRef.current
            if (ctx.chatType === 'personal' && ctx.selectedUserId === data.from.id) return
            setUnreadCounts((prev) => ({
                ...prev,
                [data.from.id]: (prev[data.from.id] || 0) + 1,
            }))
            setTeamUsers((prev) =>
                prev.map((u) =>
                    u.id === data.from.id
                        ? { ...u, unreadCount: (u.unreadCount || 0) + 1 }
                        : u
                )
            )
        }

        // ── Online/Offline ──
        const onUserOnline = (data: { userId: string }) => {
            setTeamUsers((prev) =>
                prev.map((u) => u.id === data.userId ? { ...u, isOnline: true, lastSeen: undefined } : u)
            )
        }
        const onUserOffline = (data: { userId: string }) => {
            setTeamUsers((prev) =>
                prev.map((u) =>
                    u.id === data.userId
                        ? { ...u, isOnline: false, lastSeen: new Date().toISOString() }
                        : u
                )
            )
        }

        // ── Initial online list (server sends this on connect) ──
        const onOnlineList = (data: { onlineUserIds: string[] }) => {
            setTeamUsers((prev) =>
                prev.map((u) => ({
                    ...u,
                    isOnline: data.onlineUserIds.includes(u.id),
                }))
            )
        }

        socket.on('chat:message', onTeamMessage)
        socket.on('chat:personal', onPersonalMessage)
        socket.on('chat:personal:notify', onPersonalNotify)
        socket.on('user:online', onUserOnline)
        socket.on('user:offline', onUserOffline)
        socket.on('users:online-list', onOnlineList)

        return () => {
            socket.off('chat:message', onTeamMessage)
            socket.off('chat:personal', onPersonalMessage)
            socket.off('chat:personal:notify', onPersonalNotify)
            socket.off('user:online', onUserOnline)
            socket.off('user:offline', onUserOffline)
            socket.off('users:online-list', onOnlineList)
            socket.emit('chat:leave')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Re-apply online list when teamUsers loads (race condition fix) ─────────
    useEffect(() => {
        const socket = getSocket()
        if (!socket || teamUsers.length === 0) return
        // Ask server to re-emit online list after users load
        socket.emit('ping')  // any event that triggers response to sync
    }, [teamUsers.length])

    // ── Personal room join/leave ───────────────────────────────────────────────
    useEffect(() => {
        const socket = getSocket()
        if (!socket || chatType !== 'personal' || !selectedUser) return
        socket.emit('personal:enter', { otherUserId: selectedUser.id })
        return () => {
            socket.emit('personal:leave', { otherUserId: selectedUser.id })
        }
    }, [chatType, selectedUser?.id])

    // ── Select user ────────────────────────────────────────────────────────────
    const handleSelectUser = (u: UserWithStatus) => {
        setSelectedUser(u)
        setChatType('personal')
        loadPersonalMessages(u.id)
    }

    const handleSelectTeam = () => {
        setChatType('team')
        setSelectedUser(null)
        loadTeamMessages()
    }

    // ── Send message ───────────────────────────────────────────────────────────
    const handleSend = async () => {
        if (!text.trim() || sending) return
        if (chatType === 'personal' && !selectedUser) {
            toast.error('Select a person to chat with')
            return
        }

        const msgText = text.trim()
        setText('')
        setSending(true)

        try {
            if (chatType === 'personal' && selectedUser) {
                // Optimistic message
                const optimistic: ChatMessage = {
                    _id: `temp_${Date.now()}`,
                    senderId: user?.id || '',
                    senderName: user?.name || '',
                    senderEmail: user?.email || '',
                    receiverId: selectedUser.id,
                    receiverName: selectedUser.name,
                    message: msgText,
                    createdAt: new Date().toISOString(),
                    chatType: 'personal',
                }
                setMessages((prev) => [...prev, optimistic])
                setTimeout(() => scrollToBottom(), 80)
                await chatApi.sendPersonalMessage(selectedUser.id, msgText)
            } else {
                await chatApi.sendMessage(msgText)
                // team message arrives via socket broadcast
            }
        } catch {
            toast.error('Failed to send message')
            setText(msgText)
            // Remove optimistic on failure
            setMessages((prev) => prev.filter((m) => !m._id.startsWith('temp_')))
        } finally {
            setSending(false)
            textareaRef.current?.focus()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const formatTime = (dateStr: string) =>
        new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        const today = new Date()
        if (d.toDateString() === today.toDateString()) return 'Today'
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
        return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
    }

    // Group messages by date
    const groupedMessages: { date: string; msgs: ChatMessage[] }[] = []
    messages.forEach((msg) => {
        const dateKey = formatDate(msg.createdAt)
        const last = groupedMessages[groupedMessages.length - 1]
        if (last && last.date === dateKey) last.msgs.push(msg)
        else groupedMessages.push({ date: dateKey, msgs: [msg] })
    })

    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

    return (
        <div style={s.page}>
            {/* Sidebar */}
            <div style={s.sidebar}>
                {/* Team Chat */}
                <div
                    style={{
                        ...s.sidebarItem,
                        background: chatType === 'team' ? 'var(--accent-dim)' : 'transparent',
                        borderLeft: chatType === 'team' ? '3px solid var(--accent)' : '3px solid transparent',
                    }}
                    onClick={handleSelectTeam}
                >
                    <div style={s.sidebarIcon}>
                        <Hash size={15} color={chatType === 'team' ? 'var(--accent-light)' : 'var(--text-secondary)'} />
                    </div>
                    <div style={s.sidebarInfo}>
                        <span style={{ ...s.sidebarName, color: chatType === 'team' ? 'var(--accent-light)' : 'var(--text-primary)' }}>
                            Team Chat
                        </span>
                        <span style={s.sidebarSub}>{user?.organizationName}</span>
                    </div>
                </div>

                <div style={s.divider}>
                    <span>DIRECT MESSAGES</span>
                    {totalUnread > 0 && <span style={s.totalBadge}>{totalUnread > 99 ? '99+' : totalUnread}</span>}
                </div>

                {loadingUsers ? (
                    <div style={s.emptyText}>Loading members…</div>
                ) : teamUsers.length === 0 ? (
                    <div style={s.emptyText}>No other members</div>
                ) : (
                    <div style={s.userList}>
                        {teamUsers.map((u) => (
                            <div
                                key={u.id}
                                style={{
                                    ...s.sidebarItem,
                                    background: selectedUser?.id === u.id ? 'var(--accent-dim)' : 'transparent',
                                    borderLeft: selectedUser?.id === u.id ? '3px solid var(--accent)' : '3px solid transparent',
                                }}
                                onClick={() => handleSelectUser(u)}
                            >
                                <div style={s.avatarWrap}>
                                    <div style={s.avatarSmall}>{u.name?.charAt(0).toUpperCase()}</div>
                                    <div style={{
                                        ...s.statusDot,
                                        background: u.isOnline ? 'var(--success)' : '#4b5563',
                                    }} />
                                </div>
                                <div style={s.sidebarInfo}>
                                    <div style={s.nameRow}>
                                        <span style={{
                                            ...s.sidebarName,
                                            color: selectedUser?.id === u.id ? 'var(--accent-light)' : 'var(--text-primary)',
                                        }}>
                                            {u.name}
                                        </span>
                                        {(u.unreadCount || 0) > 0 && (
                                            <span style={s.badge}>
                                                {(u.unreadCount || 0) > 99 ? '99+' : u.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{
                                        ...s.sidebarSub,
                                        color: u.isOnline ? 'var(--success)' : 'var(--text-muted)',
                                    }}>
                                        {u.isOnline
                                            ? '● Online'
                                            : u.lastSeen
                                                ? `Last seen ${formatTime(u.lastSeen)}`
                                                : '○ Offline'
                                        }
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Main chat */}
            <div style={s.chatContainer}>
                {/* Header */}
                <div style={s.header}>
                    <div style={s.headerLeft}>
                        <div style={s.headerIcon}>
                            {chatType === 'team'
                                ? <Hash size={18} color="var(--accent-light)" />
                                : <MessageSquare size={18} color="var(--accent-light)" />
                            }
                        </div>
                        <div>
                            <h1 style={s.title}>
                                {chatType === 'team' ? 'Team Chat' : (selectedUser?.name || 'Personal Chat')}
                            </h1>
                            <p style={s.subtitle}>
                                {chatType === 'team'
                                    ? `${user?.organizationName} · All members`
                                    : selectedUser
                                        ? `${selectedUser.isOnline ? '● Online' : '○ Offline'} · ${selectedUser.email}`
                                        : 'Select a person from the sidebar'
                                }
                            </p>
                        </div>
                    </div>
                    <div style={s.liveBadge}>
                        <div style={s.liveDot} />
                        <span style={s.liveText}>Live</span>
                    </div>
                </div>

                {/* Messages */}
                <div style={s.messagesWrap}>
                    {chatType === 'personal' && !selectedUser ? (
                        <div style={s.emptyWrap}>
                            <Users size={48} color="var(--text-muted)" />
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                Select a team member from the sidebar to start a private conversation
                            </p>
                        </div>
                    ) : loading ? (
                        <div style={s.loadingWrap}>
                            <div style={s.spinner} />
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading messages…</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div style={s.emptyWrap}>
                            <MessageSquare size={48} color="var(--text-muted)" />
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                {chatType === 'team'
                                    ? 'No messages yet. Start the conversation!'
                                    : `Start chatting with ${selectedUser?.name}`
                                }
                            </p>
                        </div>
                    ) : (
                        <>
                            {groupedMessages.map(({ date, msgs }) => (
                                <div key={date}>
                                    <div style={s.dateDivider}>
                                        <div style={s.dateLine} />
                                        <span style={s.dateLabel}>{date}</span>
                                        <div style={s.dateLine} />
                                    </div>
                                    {msgs.map((msg, i) => {
                                        const isMe = msg.senderId === user?.id
                                        const isTemp = msg._id.startsWith('temp_')
                                        const prevMsg = i > 0 ? msgs[i - 1] : null
                                        const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId

                                        return (
                                            <div
                                                key={msg._id}
                                                style={{
                                                    ...s.messageRow,
                                                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                                                    marginTop: showAvatar ? '16px' : '2px',
                                                    opacity: isTemp ? 0.7 : 1,
                                                }}
                                            >
                                                {!isMe && (
                                                    <div style={{ ...s.avatarWrapMsg, visibility: showAvatar ? 'visible' : 'hidden' }}>
                                                        <div style={s.avatar}>
                                                            {msg.senderName?.charAt(0).toUpperCase() ?? '?'}
                                                        </div>
                                                    </div>
                                                )}
                                                <div style={{ maxWidth: '65%' }}>
                                                    {!isMe && showAvatar && (
                                                        <p style={s.senderName}>{msg.senderName}</p>
                                                    )}
                                                    <div style={{
                                                        ...s.bubble,
                                                        background: isMe ? 'var(--gradient)' : 'var(--bg-elevated)',
                                                        color: isMe ? '#fff' : 'var(--text-primary)',
                                                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                    }}>
                                                        <p style={s.bubbleText}>{msg.message}</p>
                                                    </div>
                                                    <p style={{ ...s.timeStamp, textAlign: isMe ? 'right' : 'left' }}>
                                                        {isTemp ? 'Sending…' : formatTime(msg.createdAt)}
                                                    </p>
                                                </div>
                                                {isMe && showAvatar && (
                                                    <div style={s.avatarWrapMsg}>
                                                        <div style={{ ...s.avatar, background: 'var(--gradient)' }}>
                                                            {user?.name?.charAt(0).toUpperCase() ?? '?'}
                                                        </div>
                                                    </div>
                                                )}
                                                {isMe && !showAvatar && <div style={{ width: '36px', flexShrink: 0 }} />}
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </>
                    )}
                </div>

                {/* Input */}
                {(chatType === 'team' || selectedUser) && (
                    <div style={s.inputArea}>
                        <div style={s.inputRow}>
                            <textarea
                                ref={textareaRef}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    chatType === 'team'
                                        ? `Message #team-chat…`
                                        : `Message ${selectedUser?.name}…`
                                }
                                style={s.textarea}
                                rows={1}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!text.trim() || sending}
                                style={{ ...s.sendBtn, opacity: !text.trim() || sending ? 0.5 : 1 }}
                            >
                                {sending ? <span style={s.miniSpinner} /> : <Send size={18} />}
                            </button>
                        </div>
                        <p style={s.hint}>Enter to send · Shift+Enter for new line</p>
                    </div>
                )}
            </div>
        </div>
    )
}

const s: Record<string, React.CSSProperties> = {
    page: {
        display: 'flex',
        height: 'calc(100vh - 64px)',
        minHeight: '500px',
        margin: '-32px',
    },
    sidebar: {
        width: '256px',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        overflowY: 'auto',
        flexShrink: 0,
    },
    sidebarItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 10px',
        cursor: 'pointer',
        transition: 'background 0.15s',
        borderLeft: '3px solid transparent',
    },
    sidebarIcon: {
        width: '30px',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    sidebarInfo: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
    },
    nameRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '6px',
    },
    sidebarName: {
        fontSize: '13px',
        fontWeight: 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    sidebarSub: {
        fontSize: '11px',
        color: 'var(--text-muted)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    divider: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px 5px',
        fontSize: '10px',
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        borderTop: '1px solid var(--border)',
        marginTop: '2px',
    },
    totalBadge: {
        background: 'var(--danger)',
        color: '#fff',
        borderRadius: '99px',
        padding: '1px 5px',
        fontSize: '10px',
        fontWeight: 700,
    },
    userList: { flex: 1 },
    emptyText: {
        padding: '16px',
        fontSize: '12px',
        color: 'var(--text-muted)',
        textAlign: 'center',
    },
    avatarWrap: { position: 'relative', flexShrink: 0 },
    avatarSmall: {
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        background: 'var(--gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '12px',
        color: '#fff',
    },
    statusDot: {
        position: 'absolute',
        bottom: '0px',
        right: '0px',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        border: '2px solid var(--bg-secondary)',
    },
    badge: {
        background: 'var(--danger)',
        color: '#fff',
        borderRadius: '99px',
        padding: '1px 5px',
        fontSize: '10px',
        fontWeight: 700,
        flexShrink: 0,
    },
    chatContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        padding: '24px 32px 0',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    headerIcon: {
        width: '38px',
        height: '38px',
        borderRadius: '10px',
        background: 'var(--accent-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: { fontSize: '18px', fontWeight: 800, marginBottom: '2px' },
    subtitle: { fontSize: '12px', color: 'var(--text-muted)' },
    liveBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '20px',
        background: 'var(--success-dim)',
    },
    liveDot: {
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        background: 'var(--success)',
    },
    liveText: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--success)',
    },
    messagesWrap: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px 0',
        display: 'flex',
        flexDirection: 'column',
    },
    loadingWrap: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
    },
    emptyWrap: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        textAlign: 'center',
        padding: '20px',
    },
    spinner: {
        width: '28px',
        height: '28px',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    dateDivider: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        margin: '20px 0 8px',
        padding: '0 4px',
    },
    dateLine: { flex: 1, height: '1px', background: 'var(--border)' },
    dateLabel: {
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
    },
    messageRow: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        padding: '0 4px',
        transition: 'opacity 0.2s',
    },
    avatarWrapMsg: { flexShrink: 0 },
    avatar: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '13px',
        color: '#fff',
        border: '1px solid var(--border)',
    },
    senderName: {
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--text-muted)',
        marginBottom: '4px',
        marginLeft: '4px',
    },
    bubble: { padding: '10px 14px', wordBreak: 'break-word' },
    bubbleText: { fontSize: '14px', lineHeight: 1.5, margin: 0 },
    timeStamp: {
        fontSize: '10px',
        color: 'var(--text-muted)',
        marginTop: '3px',
        padding: '0 4px',
    },
    inputArea: {
        borderTop: '1px solid var(--border)',
        padding: '16px 0',
        flexShrink: 0,
    },
    inputRow: { display: 'flex', gap: '12px', alignItems: 'flex-end' },
    textarea: {
        flex: 1,
        padding: '12px 16px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-primary)',
        fontSize: '14px',
        outline: 'none',
        resize: 'none',
        lineHeight: 1.5,
        minHeight: '48px',
        maxHeight: '140px',
        overflowY: 'auto',
    },
    sendBtn: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'var(--gradient)',
        border: 'none',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'opacity 0.2s',
        cursor: 'pointer',
    },
    miniSpinner: {
        width: '16px',
        height: '16px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        display: 'inline-block',
    },
    hint: {
        fontSize: '11px',
        color: 'var(--text-muted)',
        marginTop: '8px',
    },
}