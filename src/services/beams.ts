// Pusher Beams — browser push notifications
// Initialisation is best-effort: failures are logged but never thrown
// so auth flow is never blocked.

export interface BeamsConfig {
    instanceId: string
    interests: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let beamsClient: any = null

export const initBeams = async (config: BeamsConfig): Promise<void> => {
    try {
        const { instanceId, interests } = config

        if (!instanceId || instanceId === 'your_beams_instance_id') {
            console.warn('⚠️ Pusher Beams instance ID not configured — push notifications disabled.')
            return
        }

        // Dynamically import so it never crashes during SSR / unit tests
        const { Client } = await import('@pusher/push-notifications-web')

        const client = new Client({ instanceId })
        beamsClient = client

        await client.start()

        for (const interest of interests) {
            if (interest) await client.addDeviceInterest(interest)
        }

        console.log('🔔 Pusher Beams ready. Interests:', interests)
    } catch (err) {
        // Non-fatal — app works without push notifications
        console.warn('🔔 Pusher Beams init failed (non-fatal):', err)
    }
}

export const stopBeams = async (): Promise<void> => {
    try {
        if (beamsClient) {
            await beamsClient.stop()
            beamsClient = null
        }
    } catch (err) {
        console.warn('🔔 Pusher Beams stop error (non-fatal):', err)
    }
}