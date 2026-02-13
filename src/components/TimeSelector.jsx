import './TimeSelector.css'

function TimeSelector({ selectedDuration, onSelect }) {
    const options = [
        { label: '15m', value: 15 },
        { label: '30m', value: 30 },
        { label: '45m', value: 45 },
        { label: '1h', value: 60 },
        { label: '2h', value: 120 },
        { label: '3h', value: 180 },
    ]

    return (
        <div className="time-selector">
            {options.map((option) => (
                <button
                    key={option.value}
                    className={`time-pill ${selectedDuration === option.value ? 'active' : ''}`}
                    onClick={() => onSelect(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}

export default TimeSelector
