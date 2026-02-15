import { useState, useEffect, useRef } from 'react'
import ReminderInput from './components/ReminderInput'
import TimeSelector from './components/TimeSelector'
import RemindButton from './components/RemindButton'
import ReminderList from './components/ReminderList'
import SettingsView from './components/SettingsView'
import WelcomeScreen from './components/WelcomeScreen'
import Footer from './components/Footer'
import { notificationManager } from './services/NotificationManager'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import './App.css'

function App() {
  const [inputValue, setInputValue] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(30) // Default 30m
  const [currentView, setCurrentView] = useState('home') // 'home' | 'settings'
  const currentViewRef = useRef(currentView) // Ref to track view inside listeners
  const [permissionError, setPermissionError] = useState(null) // State for permission error

  // Settings State
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('soonish-settings')
    return saved ? JSON.parse(saved) : { deferTime: '09:00' }
  })

  const [hasOnboarded, setHasOnboarded] = useState(() => {
    return localStorage.getItem('soonish-onboarded') === 'true'
  })

  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('soonish-reminders')
    return saved ? JSON.parse(saved) : []
  })

  // Persistence
  useEffect(() => {
    localStorage.setItem('soonish-reminders', JSON.stringify(reminders))
  }, [reminders])

  // Sync Ref with State
  useEffect(() => {
    currentViewRef.current = currentView
  }, [currentView])

  // Request permissions only if NOT showing welcome screen (i.e. already onboarded)
  // If not onboarded, WelcomeScreen handles it.
  useEffect(() => {
    const checkPermissions = async () => {
      // Only check silently, don't request if we are already onboarded
      // This logic might need adjustment but for now removing the aggressive request
      if (hasOnboarded && Capacitor.getPlatform() !== 'web') {
        // Optionally check status here if needed, but we do it lazily
      }
    }
    checkPermissions()
  }, [hasOnboarded])

  useEffect(() => {
    localStorage.setItem('soonish-settings', JSON.stringify(settings))
  }, [settings])

  // Timer Loop (Foreground UI Updates)
  useEffect(() => {
    const interval = setInterval(() => {
      setReminders(prev => prev.map(reminder => {
        // Calculate remaining based on target time to be robust against backgrounding
        const now = Date.now()
        const remaining = Math.max(0, Math.ceil((reminder.targetTime - now) / 1000))

        // Trigger Web Notification manually if countdown hits 0 and we are on web
        // Native notifications are handled by the OS scheduler
        if (remaining === 0 && !reminder.notified && Capacitor.getPlatform() === 'web') {
          triggerWebNotification(reminder.text)
          return { ...reminder, remaining: 0, notified: true }
        }

        return { ...reminder, remaining }
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Auto-cleanup dismissed reminders at midnight
  useEffect(() => {
    const scheduleMidnightCleanup = () => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      const msUntilMidnight = midnight - now

      return setTimeout(() => {
        // Remove reminders that have been completed (remaining === 0)
        setReminders(prev => {
          const cleaned = prev.filter(r => r.remaining > 0)
          console.log(`Cleaned up ${prev.length - cleaned.length} old reminders`)
          return cleaned
        })

        // Schedule next cleanup
        scheduleMidnightCleanup()
      }, msUntilMidnight)
    }

    const timer = scheduleMidnightCleanup()
    return () => clearTimeout(timer)
  }, [])

  const triggerWebNotification = (text) => {
    if (Notification.permission === 'granted') {
      new Notification('Soonish Reminder', {
        body: text,
        icon: '/pwa-192x192.png',
        vibrate: [200, 100, 200]
      })
    }
  }

  // Handle Notification Actions
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'web') {
      import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
        LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          console.log('[App] Action Performed:', action)
          if (action.actionId === 'SNOOZE') {
            // Default snooze 10m from notification action
            handleSnooze(action.notification.id, 10)
          } else if (action.actionId === 'DISMISS') {
            handleDelete(action.notification.id)
          }
        })
      })
    }
  }, [])

  // Handle Android back button
  // Handle Android back button
  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        // Use Ref to get current value inside closure
        if (currentViewRef.current === 'settings') {
          // If in settings, go back to home instead of exiting
          setCurrentView('home')
        } else if (!canGoBack) {
          // If on home screen, exit the app
          CapacitorApp.exitApp()
        }
      })
    }
  }, []) // Register ONCE on mount

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleAddReminder()
    }
  }

  const handleAddReminder = async () => {
    console.log('[App] handleAddReminder called')
    if (!inputValue.trim()) {
      console.log('[App] Input empty, ignoring')
      return
    }

    try {
      setPermissionError(null) // Clear previous errors
      console.log('[App] Requesting permissions...')
      const permission = await notificationManager.requestPermissions()
      console.log('[App] Permissions requested, result:', permission)

      if (permission !== 'granted') {
        const msg = permission === 'denied'
          ? 'Notifications are blocked. Please enable them in your device settings.'
          : 'Notification permission is required to set reminders.'
        setPermissionError(msg)
        return
      }

      let durationSeconds = selectedDuration * 60
      let text = inputValue

      // Dev Helper: Check for [min] at start of text
      const customTimeMatch = text.match(/^\[(\d+)\]\s*(.*)/)
      if (customTimeMatch) {
        const minutes = parseInt(customTimeMatch[1], 10)
        if (!isNaN(minutes) && minutes > 0) {
          durationSeconds = minutes * 60
          text = customTimeMatch[2] || "Reminder" // Use captured text or default
          console.log(`[Dev] Using custom duration: ${minutes}m`)
        }
      }

      const now = Date.now()
      const targetTime = now + (durationSeconds * 1000)
      // Use integer ID for Capacitor compatibility
      const id = Math.floor(now % 2147483647)

      const newReminder = {
        id,
        text: text,
        originalDuration: durationSeconds,
        remaining: durationSeconds,
        targetTime: targetTime,
        createdAt: now,
        notified: false
      }

      console.log('[App] Adding new reminder:', newReminder)
      setReminders(prev => [newReminder, ...prev])
      setInputValue('')

      // Schedule Native Notification
      console.log('[App] Scheduling notification...')
      console.log('[App] Scheduling notification...')
      await notificationManager.schedule('Soonish Reminder', newReminder.text, durationSeconds, id)
      console.log('[App] Reminder added successfully')

      // Haptic Feedback
      if (Capacitor.isNativePlatform()) {
        await Haptics.notification({ type: NotificationType.Success })
      }
    } catch (error) {
      console.error('[App] Error adding reminder:', error)
      alert('Failed to add reminder: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium })
    }
    notificationManager.cancel(id)
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  const handleSnooze = async (id, minutes = 30) => {
    // Haptic Feedback
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light })
    }

    // Cancel existing notification
    await notificationManager.cancel(id)

    setReminders(prev => prev.map(r => {
      if (r.id === id) {
        const now = Date.now()
        const additionalSeconds = minutes * 60
        const newTargetTime = now + (additionalSeconds * 1000)

        // Reschedule
        notificationManager.schedule('Soonish Reminder', r.text, additionalSeconds, id)

        return {
          ...r,
          targetTime: newTargetTime,
          remaining: additionalSeconds,
          notified: false
        }
      }
      return r
    }))
  }

  const handleDeferAll = async () => {
    const activeReminders = reminders.filter(r => r.remaining > 0)

    // Show friendly message if no active reminders
    if (activeReminders.length === 0) {
      alert('No active reminders to defer. Create a reminder first!')
      return
    }

    if (!window.confirm(`Defer ${activeReminders.length} reminder${activeReminders.length > 1 ? 's' : ''} to tomorrow ${settings.deferTime}?`)) return

    // Parse Settings Time
    const [hours, minutes] = settings.deferTime.split(':').map(Number)

    // Calculate tomorrow at configured time
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(hours, minutes, 0, 0)

    const now = Date.now()
    const secondsUntilTomorrow = Math.ceil((tomorrow.getTime() - now) / 1000)

    // Process all
    await Promise.all(activeReminders.map(async (r) => {
      await notificationManager.cancel(r.id)
      await notificationManager.schedule('Deferred Reminder', r.text, secondsUntilTomorrow, r.id)
    }))

    setReminders(prev => prev.map(r => {
      if (r.remaining > 0) {
        return {
          ...r,
          targetTime: tomorrow.getTime(),
          remaining: secondsUntilTomorrow,
          notified: false,
          originalDuration: secondsUntilTomorrow // Update duration to reflect long wait
        }
      }
      return r
    }))
  }

  const openAppSettings = async () => {
    if (Capacitor.getPlatform() !== 'web') {
      try {
        await NativeSettings.open({
          optionAndroid: AndroidSettings.ApplicationDetails,
          optionIOS: IOSSettings.App
        })
      } catch (error) {
        console.error('Error opening settings:', error)
        alert('Could not open settings. Please open Settings app manually.')
      }
    } else {
      alert('Please enable notifications in your browser settings.')
    }
  }

  if (!hasOnboarded) {
    return <WelcomeScreen onComplete={() => setHasOnboarded(true)} />
  }

  if (currentView === 'settings') {
    return (
      <SettingsView
        settings={settings}
        onSave={setSettings}
        onBack={() => setCurrentView('home')}
      />
    )
  }

  return (
    <div className="app-container">
      <header>
        <h1>
          Soonish
          {reminders.filter(r => r.remaining > 0).length > 0 && (
            <span className="reminder-badge">
              {reminders.filter(r => r.remaining > 0).length}
            </span>
          )}
        </h1>
        <div className="header-actions">
          <button
            className="icon-button"
            onClick={handleDeferAll}
            aria-label={`Defer all to tomorrow ${settings.deferTime}`}
            title={`Defer all to tomorrow ${settings.deferTime}`}
          >
            🌙
          </button>
          <button
            className="icon-button"
            onClick={() => setCurrentView('settings')}
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {permissionError && (
        <div className="permission-error-card">
          <div className="error-header">
            <div className="error-icon">⚠️</div>
            <h3>Notifications Blocked</h3>
          </div>

          <p className="error-message">
            {permissionError}
          </p>

          <div className="error-actions">
            <button
              className="primary-action"
              onClick={openAppSettings}
            >
              Open Settings
            </button>

            <button
              className="secondary-action"
              onClick={() => setPermissionError(null)}
            >
              Dismiss
            </button>
          </div>

          <details className="help-section">
            <summary>How to enable notifications</summary>
            <ol>
              <li>Tap "Open Settings" above</li>
              <li>Find "Notifications" or "App notifications"</li>
              <li>Toggle notifications ON for Soonish</li>
              <li>Return to the app and try again</li>
            </ol>
          </details>
        </div>
      )}

      <main>
        <section className="input-section">
          <ReminderInput
            value={inputValue}
            onChange={setInputValue}
            onKeyPress={handleKeyPress}
          />
          <TimeSelector selectedDuration={selectedDuration} onSelect={setSelectedDuration} />
          <RemindButton onClick={handleAddReminder} disabled={!inputValue.trim()} />
        </section>

        <ReminderList
          reminders={reminders}
          onDelete={handleDelete}
          onSnooze={handleSnooze}
        />
      </main>
      <Footer />
    </div>
  )
}

export default App
