import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

class NotificationManager {
    constructor() {
        this.platform = Capacitor.getPlatform()
        this.initialized = false
    }

    async init() {
        if (this.platform !== 'web' && !this.initialized) {
            try {
                console.log('[NotificationManager] Initializing...')

                // Create High Priority Channel for alarms
                const channelResult = await LocalNotifications.createChannel({
                    id: 'soonish_alarm',
                    name: 'Soonish Alarms',
                    description: 'Critical reminders that bypass Do Not Disturb',
                    importance: 5, // IMPORTANCE_MAX (not just HIGH)
                    visibility: 1, // VISIBILITY_PUBLIC
                    sound: 'default', // Use system default sound
                    vibration: true,
                    lights: true,
                    lightColor: '#FF0000',
                })

                console.log('[NotificationManager] Channel created:', channelResult)

                // Register action types
                await LocalNotifications.registerActionTypes({
                    types: [{
                        id: 'ALARM_ACTIONS',
                        actions: [
                            {
                                id: 'SNOOZE',
                                title: 'Snooze 10m',
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

                this.initialized = true
                console.log('[NotificationManager] Initialized successfully')
            } catch (error) {
                console.error('[NotificationManager] Init error:', error)
            }
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
            // Initialize channel first
            await this.init()

            // Request notification permissions
            const result = await LocalNotifications.requestPermissions()
            console.log('[NotificationManager] Permission result:', result)

            if (result.display === 'granted') {
                // On Android 12+, also check for exact alarm permission
                if (Capacitor.isNativePlatform()) {
                    try {
                        // Check if we can schedule exact alarms
                        await LocalNotifications.checkPermissions()
                        console.log('[NotificationManager] Exact alarm permissions OK')
                    } catch (error) {
                        console.warn('[NotificationManager] Exact alarm permission issue:', error)
                    }
                }
            }

            return result.display
        }
    }

    async schedule(title, body, seconds, id) {
        console.log('[NotificationManager] Scheduling:', { title, body, seconds, id })

        if (this.platform === 'web') {
            await this.requestPermissions()
            return
        }

        try {
            // Ensure we're initialized
            await this.init()

            const triggerTime = new Date(Date.now() + seconds * 1000)
            console.log('[NotificationManager] Trigger time:', triggerTime.toISOString())

            // Schedule with all the bells and whistles
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title,
                        body,
                        id,
                        schedule: {
                            at: triggerTime,
                            allowWhileIdle: true, // CRITICAL: Allow when device is idle
                        },
                        sound: 'default', // Use system sound
                        channelId: 'soonish_alarm', // Use our high-priority channel
                        actionTypeId: 'ALARM_ACTIONS',
                        extra: {
                            reminderTime: triggerTime.getTime()
                        },
                        // CRITICAL FLAGS FOR LOCK SCREEN
                        autoCancel: false, // Don't auto-dismiss
                        ongoing: false, // Not a persistent notification
                        smallIcon: 'ic_stat_icon_config_sample', // Default Capacitor icon
                        largeIcon: null,
                        iconColor: '#FF0000',
                    }
                ]
            })

            console.log('[NotificationManager] Scheduled successfully')

            // Verify it was scheduled
            const pending = await LocalNotifications.getPending()
            console.log('[NotificationManager] Pending notifications:', pending.notifications.length)

        } catch (error) {
            console.error('[NotificationManager] Schedule error:', error)
            throw error
        }
    }

    async cancel(id) {
        if (this.platform !== 'web') {
            try {
                await LocalNotifications.cancel({ notifications: [{ id }] })
                console.log('[NotificationManager] Cancelled notification:', id)
            } catch (error) {
                console.error('[NotificationManager] Cancel error:', error)
            }
        }
    }

    // Helper to check what's pending (for debugging)
    async getPending() {
        if (this.platform !== 'web') {
            const result = await LocalNotifications.getPending()
            console.log('[NotificationManager] Pending:', result.notifications)
            return result.notifications
        }
        return []
    }
}

export const notificationManager = new NotificationManager()
