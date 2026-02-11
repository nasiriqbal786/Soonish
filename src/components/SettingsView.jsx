import './SettingsView.css'

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
            </div>
        </div>
    )
}

export default SettingsView
