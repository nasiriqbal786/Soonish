import './SettingsView.css'
import { Capacitor } from '@capacitor/core'

function SettingsView({ settings, onSave, onBack }) {
    const handleChange = (e) => {
        onSave({ ...settings, deferTime: e.target.value })
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

                <div className="setting-item">
                    <label>📱 For Reliable Notifications</label>
                    <div className="setting-desc">
                        To ensure reminders work on locked screen:
                        <ul>
                            <li>Allow notifications in Android settings</li>
                            <li>Disable battery optimization for Soonish</li>
                            <li>Set notification importance to "High"</li>
                        </ul>
                        <button
                            className="primary-button"
                            style={{ marginTop: '10px', padding: '8px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px' }}
                            onClick={() => {
                                // Open app settings
                                if (Capacitor.isNativePlatform()) {
                                    window.open('app-settings:', '_system')
                                } else {
                                    alert('On mobile, this would open App Settings.')
                                }
                            }}
                        >
                            Open App Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SettingsView
