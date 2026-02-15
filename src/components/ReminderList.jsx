import './ReminderList.css'

function ReminderList({ reminders, onDelete, onSnooze }) {
    if (reminders.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">⏰</div>
                <h3>No reminders yet</h3>
                <p>Create your first reminder above!</p>
            </div>
        )
    }

    return (
        <div className="reminder-list">
            <h2 className="list-title">Pending</h2>
            <div className="list-items">
                {reminders.map((reminder) => (
                    <div key={reminder.id} className={`reminder-item ${reminder.remaining === 0 ? 'due' : ''}`}>
                        <div className="reminder-info">
                            <span className="reminder-text">{reminder.text}</span>
                            <span className="reminder-time">{formatTime(reminder.remaining)}</span>
                        </div>
                        <div className="reminder-actions">
                            <div className="snooze-actions">
                                <button
                                    className="action-btn snooze-quick"
                                    onClick={() => onSnooze(reminder.id, 15)}
                                    title="Snooze 15 minutes"
                                >
                                    +15m
                                </button>
                                <button
                                    className="action-btn snooze-quick"
                                    onClick={() => onSnooze(reminder.id, 30)}
                                    title="Snooze 30 minutes"
                                >
                                    +30m
                                </button>
                                <button
                                    className="action-btn snooze-quick"
                                    onClick={() => onSnooze(reminder.id, 60)}
                                    title="Snooze 1 hour"
                                >
                                    +1h
                                </button>
                            </div>
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
