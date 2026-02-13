import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { notificationManager } from '../services/NotificationManager'
import './SettingsView.css'

function SettingsView({ settings, onSave, onBack }) {
    const [permissionStatus, setPermissionStatus] = useState('checking')

    useEffect(() => {
        checkPermissionStatus()
    }, [])

    const checkPermissionStatus = async () => {
        if (Capacitor.getPlatform() === 'web') {
            setPermissionStatus(Notification.permission)
        } else {
            try {
                const result = await notificationManager.checkPermissionStatus()
                setPermissionStatus(result)
            } catch (error) {
                console.error('Error checking permissions:', error)
                setPermissionStatus('unknown')
            }
        }
    }

    const handleChange = (e) => {
        onSave({ ...settings, deferTime: e.target.value })
    }

    const requestPermissions = async () => {
        await notificationManager.requestPermissions()
        await checkPermissionStatus()
    }

    const openSystemSettings = () => {
        if (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
            window.open('app-settings:', '_system')
        }
    }

    return (
        <div className="settings-view">
            <header className="settings-header">
                <button className="back-button" onClick={onBack}>
                    ← Back
                </button>
                <h2>Settings</h2>
            </header>

            <div className="settings-content">
                {/* Permission Status Section */}
                <div className="setting-section">
                    <h3>Permissions</h3>

                    <div className="permission-status-card">
                        <div className="permission-item">
                            <div className="permission-info">
                                <span className="permission-label">Notifications</span>
                                <span className="permission-desc">
                                    Required for reminders to work
                                </span>
                            </div>

                            <div className="permission-status">
                                {permissionStatus === 'granted' && (
                                    <span className="status-badge granted">✓ Enabled</span>
                                )}
                                {(permissionStatus === 'denied' || permissionStatus === 'blocked') && (
                                    <>
                                        <span className="status-badge denied">✗ Blocked</span>
                                        <button
                                            className="fix-button"
                                            onClick={openSystemSettings}
                                        >
                                            Fix in Settings
                                        </button>
                                    </>
                                )}
                                {permissionStatus === 'default' && (
                                    <button
                                        className="enable-button"
                                        onClick={requestPermissions}
                                    >
                                        Enable
                                    </button>
                                )}
                                {permissionStatus === 'checking' && (
                                    <span className="status-badge checking">Checking...</span>
                                )}
                            </div>
                        </div>

                        {(permissionStatus === 'denied' || permissionStatus === 'blocked') && (
                            <div className="permission-help">
                                <p>
                                    <strong>Notifications are blocked.</strong> To enable them:
                                </p>
                                <ol>
                                    <li>Tap "Fix in Settings"</li>
                                    <li>Enable notifications for Soonish</li>
                                    <li>Return to the app</li>
                                </ol>
                            </div>
                        )}
                    </div>
                </div>

                {/* Existing Settings */}
                <div className="setting-section">
                    <h3>Preferences</h3>

                    <div className="setting-item">
                        <label htmlFor="deferTime">"Call it a night" Time</label>
                        <div className="setting-desc">
                            Time to reschedule tasks when you tap the moon icon 🌙.
                        </div>
                        <input
                            type="time"
                            id="deferTime"
                            className="time-input"
                            value={settings.deferTime}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Battery Optimization Warning (Android only) */}
                {Capacitor.getPlatform() === 'android' && (
                    <div className="setting-section">
                        <h3>⚡ Battery Optimization</h3>
                        <div className="info-card">
                            <p>
                                <strong>Important:</strong> Some Android devices aggressively kill
                                apps in the background. To ensure reliable reminders:
                            </p>
                            <ol style={{ paddingLeft: '20px', margin: '10px 0' }}>
                                <li>Go to your phone's Settings</li>
                                <li>Find "Battery" or "Battery Optimization"</li>
                                <li>Find Soonish in the app list</li>
                                <li>Select "Don't optimize" or "Unrestricted"</li>
                            </ol>
                            <button
                                className="secondary-button"
                                onClick={() => window.open('app-settings:', '_system')}
                            >
                                Open Settings
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SettingsView
