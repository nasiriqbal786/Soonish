import './ReminderInput.css'

function ReminderInput({ value, onChange, onKeyPress }) {
    return (
        <div className="input-group">
            <input
                type="text"
                className="reminder-input"
                placeholder="What’s the plan?"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyPress}
                autoFocus
            />
        </div>
    )
}

export default ReminderInput
