import { useState, useEffect } from 'react'
import ReminderInput from './components/ReminderInput'
import TimeSelector from './components/TimeSelector'
import RemindButton from './components/RemindButton'
import ReminderList from './components/ReminderList'
import SettingsView from './components/SettingsView'
import Footer from './components/Footer'
import { notificationManager } from './services/NotificationManager'
import { Capacitor } from '@capacitor/core'
import './App.css'

function App() {
  const [inputValue, setInputValue] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(30) // Default 30m
  const [currentView, setCurrentView] = useState('home') // 'home' | 'settings'

  // Settings State
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('soonish-settings')
    return saved ? JSON.parse(saved) : { deferTime: '09:00' }
  })

  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('soonish-reminders')
    return saved ? JSON.parse(saved) : []
  })

  // Persistence
  useEffect(() => {
    localStorage.setItem('soonish-reminders', JSON.stringify(reminders))
  }, [reminders])

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

  const triggerWebNotification = (text) => {
    if (Notification.permission === 'granted') {
      new Notification('Soonish Reminder', {
        body: text,
        icon: '/pwa-192x192.png',
        vibrate: [200, 100, 200]
      })
    }
  }

  const handleAddReminder = async () => {
    if (!inputValue.trim()) return

    await notificationManager.requestPermissions()

    const durationSeconds = selectedDuration * 60
    const now = Date.now()
    const targetTime = now + (durationSeconds * 1000)
    // Use integer ID for Capacitor compatibility
    const id = Math.floor(now % 2147483647)

    const newReminder = {
      id,
      text: inputValue,
      originalDuration: durationSeconds,
      remaining: durationSeconds,
      targetTime: targetTime,
      createdAt: now,
      notified: false
    }

    setReminders(prev => [newReminder, ...prev])
    setInputValue('')

    // Schedule Native Notification
    await notificationManager.schedule('Soonish Reminder', newReminder.text, durationSeconds, id)
  }

  const handleDelete = (id) => {
    notificationManager.cancel(id)
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  const handleSnooze = async (id, minutes = 30) => {
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
    if (activeReminders.length === 0) return

    if (!window.confirm(`Defer ${activeReminders.length} reminders to tomorrow ${settings.deferTime}?`)) return

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

  return (
    <div className="app-container">
      {currentView === 'home' ? (
        <>
          <header>
            <h1>Soonish</h1>
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
          <main>
            <section className="input-section">
              <ReminderInput value={inputValue} onChange={setInputValue} />
              <TimeSelector selectedDuration={selectedDuration} onSelect={setSelectedDuration} />
              <RemindButton onClick={handleAddReminder} disabled={!inputValue.trim()} />
            </section>

            <ReminderList
              reminders={reminders}
              onDelete={handleDelete}
              onSnooze={handleSnooze}
            />
          </main>
        </>
      ) : (
        <SettingsView
          settings={settings}
          onSave={setSettings}
          onBack={() => setCurrentView('home')}
        />
      )}
      <Footer />
    </div>
  )
}

export default App
