// Pusher Channels — real-time event subscription + browser notifications
// Notifications use the Notification API (not Web Push / Beams)
// Chrome suppresses notifications when the tab is focused — we handle that with in-app toasts

import toast from 'react-hot-toast'

export interface BeamsConfig {
    instanceId: string   // VITE_PUSHER_KEY
    interests: string[]  // channel names returned by /beams/auth
}

let pusherInstance: any = null
let initializedKey: string | null = null   // prevents duplicate init on StrictMode
const eventHandlers: Map<string, (data: any) => void> = new Map()

// ── Notification permission ───────────────────────────────────────────────────

export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false

    // requestPermission() MUST be called from a user gesture in modern browsers
    // We can still call it here — Chrome will show the prompt on first load
    try {
        const perm = await Notification.requestPermission()
        console.log(`🔔 Notification permission: ${perm}`)
        return perm === 'granted'
    } catch {
        return false
    }
}

// ── Show notification ─────────────────────────────────────────────────────────
// Chrome SUPPRESSES native notifications when the tab is active/focused.
// So we ALWAYS show an in-app toast (always visible), and ALSO try a native
// notification for when the user is on another tab/window.

export const showNotification = async (title: string, body: string): Promise<void> => {
    // 1. Always show in-app toast — works regardless of focus/permission
    toast(body ? `${title}\n${body}` : title, {
        icon: '🔔',
        duration: 4000,
        style: {
            background: '#1c2028',
            color: '#f0f2f7',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: '10px',
            fontSize: '13px',
            maxWidth: '340px',
        },
    })

    // 2. Also attempt native OS notification (for background tabs)
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    try {
        // Use Service Worker for best cross-browser support
        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready
            if (reg?.showNotification) {
                await reg.showNotification(title, {
                    body,
                    icon: '/vite.svg',
                    badge: '/vite.svg',
                    tag: `askora-${Date.now()}`,   // unique tag = no deduplication
                    requireInteraction: false,
                })
                return
            }
        }
        // Fallback
        const n = new Notification(title, { body, icon: '/vite.svg' })
        n.onclick = () => { window.focus(); n.close() }
    } catch (err) {
        // Silent — in-app toast already shown above
        console.debug('Native notification failed (tab focused?):', err)
    }
}

// ── Init Pusher Channels ──────────────────────────────────────────────────────

export const initBeams = async (config: BeamsConfig): Promise<void> => {
    const { instanceId, interests } = config

    if (!instanceId) {
        console.warn('⚠️ VITE_PUSHER_KEY not set')
        return
    }
    if (!interests?.length) {
        console.warn('⚠️ No Pusher interests to subscribe to')
        return
    }

    // Prevent duplicate subscriptions (React StrictMode calls this twice)
    const key = `${instanceId}:${interests.sort().join(',')}`
    if (initializedKey === key && pusherInstance) {
        console.log('ℹ️ Pusher already initialized — skipping duplicate init')
        return
    }

    // Disconnect previous instance cleanly
    if (pusherInstance) {
        try { pusherInstance.disconnect() } catch { /* ignore */ }
        pusherInstance = null
        initializedKey = null
    }

    // Request notification permission (best-effort)
    await requestNotificationPermission()

    // Register service worker
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/service-worker.js')
            console.log('✅ Service Worker registered')
        } catch (err) {
            console.warn('⚠️ SW registration failed:', err)
        }
    }

    try {
        const { default: Pusher } = await import('pusher-js')

        // Enable Pusher logging in dev
        if (import.meta.env.DEV) {
            (Pusher as any).logToConsole = false  // set true to debug Pusher wire traffic
        }

        const pusher = new Pusher(instanceId, {
            cluster: import.meta.env.VITE_PUSHER_CLUSTER || 'ap2',
            forceTLS: true,
        })

        pusherInstance = pusher
        initializedKey = key
        let subscribedCount = 0

        for (const interest of interests) {
            if (!interest) continue
            try {
                const channel = pusher.subscribe(interest)

                channel.bind('pusher:subscription_succeeded', () => {
                    console.log(`✅ Subscribed to Pusher channel: ${interest}`)
                })

                channel.bind('pusher:subscription_error', (err: any) => {
                    console.warn(`⚠️ Pusher subscription error on ${interest}:`, err)
                })

                // Listen for ALL custom events on this channel
                channel.bind_global((eventName: string, data: any) => {
                    if (eventName.startsWith('pusher:')) return  // skip internal events
                    console.log(`📬 Pusher event "${eventName}" on "${interest}":`, data)
                    handleChannelEvent(eventName, data)
                })

                subscribedCount++
            } catch (err) {
                console.warn(`⚠️ Failed to subscribe to ${interest}:`, err)
            }
        }

        console.log(`🔔 Pusher ready. Subscribed to ${subscribedCount}/${interests.length} channels`)
    } catch (err) {
        console.warn('🔔 Pusher init failed:', err instanceof Error ? err.message : String(err))
        initializedKey = null
    }
}

// ── Handle incoming events ────────────────────────────────────────────────────

const handleChannelEvent = async (eventName: string, data: any): Promise<void> => {
    try {
        switch (eventName) {
            case 'question-new':
                await showNotification(
                    '📋 New Question',
                    data.question?.text
                        ? data.question.text.substring(0, 100)
                        : 'A new question has been added'
                )
                break

            case 'question-updated':
                await showNotification(
                    '✏️ Question Updated',
                    data.question?.text
                        ? data.question.text.substring(0, 100)
                        : 'A question has been updated'
                )
                break

            case 'response-new':
                await showNotification(
                    '💬 New Response',
                    `${data.userName || 'Someone'} answered: ${data.selectedOptionText || ''}`
                )
                break

            case 'response-updated':
                await showNotification(
                    '🔄 Response Updated',
                    `Answer changed to: ${data.selectedOptionText || ''}`
                )
                break

            case 'chat-message':
            case 'chat:message':
                await showNotification(
                    `💬 ${data.senderName || 'Team Chat'}`,
                    data.message?.substring(0, 100) || 'New message'
                )
                break

            case 'personal-message':
            case 'chat:personal':
                await showNotification(
                    `💬 ${data.senderName || 'Someone'}`,
                    data.message?.substring(0, 100) || 'New personal message'
                )
                break

            default:
                console.log(`🔔 Unhandled Pusher event: "${eventName}"`)
                break
        }
    } catch (err) {
        console.error(`⚠️ Error handling "${eventName}":`, err)
    }

    // Custom handlers registered externally
    const handler = eventHandlers.get(eventName)
    if (handler) {
        try { handler(data) } catch (err) {
            console.error(`Error in custom handler for "${eventName}":`, err)
        }
    }
}

// ── Utils ─────────────────────────────────────────────────────────────────────

export const onChannelEvent = (eventName: string, handler: (data: any) => void): void => {
    eventHandlers.set(eventName, handler)
}

export const sendTestNotification = async (): Promise<void> => {
    await showNotification('🧪 Test', 'Askora notifications are working!')
}

export const stopBeams = async (): Promise<void> => {
    try {
        if (pusherInstance) {
            pusherInstance.disconnect()
            pusherInstance = null
            initializedKey = null
            eventHandlers.clear()
            console.log('🔔 Pusher disconnected')
        }
    } catch (err) {
        console.warn('⚠️ Pusher stop error:', err instanceof Error ? err.message : String(err))
    }
}