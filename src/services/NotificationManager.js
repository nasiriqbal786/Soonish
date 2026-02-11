import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

class NotificationManager {
    constructor() {
        this.platform = Capacitor.getPlatform()
    }

    async requestPermissions() {
        if (this.platform === 'web') {
            if (Notification.permission === 'default') {
                return await Notification.requestPermission()
            }
            return Notification.permission
        } else {
            const result = await LocalNotifications.requestPermissions()
            return result.display
        }
    }

    async schedule(title, body, seconds, id) {
        if (this.platform === 'web') {
            // Web Notification logic handled by app timer
            // We just ensure permission here
            this.requestPermissions()
            return
        }

        // Native: Schedule notification
        await LocalNotifications.schedule({
            notifications: [
                {
                    title,
                    body,
                    id,
                    schedule: { at: new Date(Date.now() + seconds * 1000) },
                    sound: null,
                    attachments: null,
                    actionTypeId: "",
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
