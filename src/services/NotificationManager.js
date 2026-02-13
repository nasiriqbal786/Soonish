import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

class NotificationManager {
    constructor() {
        this.platform = Capacitor.getPlatform()
    }

    async init() {
        if (this.platform !== 'web') {
            // Create High Importance Channel
            await LocalNotifications.createChannel({
                id: 'soonish_alarm',
                name: 'Soonish Alarms',
                description: 'High importance notifications for reminders',
                importance: 5, // IMPORTANCE_HIGH
                visibility: 1, // VISIBILITY_PUBLIC
                sound: 'beep.wav', // optional, falls back to default
                vibration: true,
            })

            // Register Actions
            await LocalNotifications.registerActionTypes({
                types: [{
                    id: 'ALARM_ACTIONS',
                    actions: [
                        {
                            id: 'SNOOZE',
                            title: 'Snooze 10m', // Default snooze for notification action
                            foreground: true
                        },
                        {
                            id: 'DISMISS',
                            title: 'Dismiss',
                            foreground: true,
                            destructive: true
                        }
                    ]
                }]
            })
        }
    }

    async requestPermissions() {
        console.log('[NotificationManager] Requesting permissions...')
        if (this.platform === 'web') {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission()
                console.log('[NotificationManager] Web permission result:', permission)
                return permission
            }
            console.log('[NotificationManager] Web permission already:', Notification.permission)
            return Notification.permission
        } else {
            await this.init() // Ensure channel/actions are set up
            const result = await LocalNotifications.requestPermissions()
            console.log('[NotificationManager] Native permission result:', result)
            return result.display
        }
    }

    async schedule(title, body, seconds, id) {
        console.log('[NotificationManager] Scheduling:', { title, body, seconds, id })
        if (this.platform === 'web') {
            // Web Notification logic handled by app timer
            // We just ensure permission here
            await this.requestPermissions()
            return
        }

        // Native: Schedule notification
        await LocalNotifications.schedule({
            notifications: [
                {
                    title,
                    body,
                    id,
                    schedule: {
                        at: new Date(Date.now() + seconds * 1000),
                        allowWhileIdle: true // Try to wake up device
                    },
                    sound: null, // Uses channel sound
                    attachments: null,
                    actionTypeId: "ALARM_ACTIONS",
                    channelId: "soonish_alarm",
                    extra: null
                }
            ]
        })
    }

    async cancel(id) {
        if (this.platform !== 'web') {
            await LocalNotifications.cancel({ notifications: [{ id }] })
        }
    }
}

export const notificationManager = new NotificationManager()
