import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { notificationManager } from '../services/NotificationManager'
import './WelcomeScreen.css'

function WelcomeScreen({ onComplete }) {
    const [isLoading, setIsLoading] = useState(false)

    const handleGetStarted = async () => {
        setIsLoading(true)

        if (Capacitor.getPlatform() !== 'web') {
            // Request permissions upfront with context
            await notificationManager.requestPermissions()
        }

        // Mark onboarding as complete
        localStorage.setItem('soonish-onboarded', 'true')
        onComplete()
    }

    return (
        <div className="welcome-screen">
            <div className="welcome-content">
                <h1>Welcome to Soonish</h1>
                <p className="tagline">Quick reminders for things you need to do... soonish.</p>

                <div className="features">
                    <div className="feature">
                        <span className="feature-icon">⏰</span>
                        <h3>Fast Reminders</h3>
                        <p>Set reminders in seconds with preset times</p>
                    </div>

                    <div className="feature">
                        <span className="feature-icon">🔔</span>
                        <h3>Reliable Notifications</h3>
                        <p>Get notified even when your phone is locked</p>
                    </div>

                    <div className="feature">
                        <span className="feature-icon">🌙</span>
                        <h3>Defer to Tomorrow</h3>
                        <p>Move all tasks to tomorrow with one tap</p>
                    </div>
                </div>

                <div className="permission-notice">
                    <p>
                        <strong>Soonish needs notification permissions</strong> to remind you
                        when it's time. We'll never spam you or send marketing notifications.
                    </p>
                </div>

                <button
                    className="get-started-button"
                    onClick={handleGetStarted}
                    disabled={isLoading}
                >
                    {isLoading ? 'Setting up...' : 'Get Started'}
                </button>

                <button
                    className="skip-button"
                    onClick={() => {
                        localStorage.setItem('soonish-onboarded', 'true')
                        onComplete()
                    }}
                >
                    Skip for now
                </button>
            </div>
        </div>
    )
}

export default WelcomeScreen
