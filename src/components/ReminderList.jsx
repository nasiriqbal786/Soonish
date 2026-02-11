import './ReminderList.css'

function ReminderList({ reminders, onDelete, onSnooze }) {
    if (reminders.length === 0) return null

    return (
        <div className="reminder-list">
            <h2 className="list-title">Pending</h2>
            <div className="list-items">
                {reminders.map((reminder) => (
                    <div key={reminder.id} className="reminder-item">
                        <div className="reminder-info">
                            <span className="reminder-text">{reminder.text}</span>
                            <span className="reminder-time">{formatTime(reminder.remaining)}</span>
                        </div>
                        <div className="reminder-actions">
                            {/* Snooze Logic to be refined later */}
                            <button className="action-btn snooze" onClick={() => onSnooze(reminder.id)}>
                                Snooze
                            </button>
                            <button className="action-btn done" onClick={() => onDelete(reminder.id)}>
                                Done
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function formatTime(seconds) {
    if (seconds <= 0) return "Due!"
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60

    if (h > 0) return `${h}h ${m}m`
    return `${m}m ${s}s`
}

export default ReminderList
