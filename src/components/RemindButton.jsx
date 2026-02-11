import './RemindButton.css'

function RemindButton({ onClick, disabled }) {
    return (
        <button
            className="remind-button"
            onClick={onClick}
            disabled={disabled}
        >
            Remind Me
        </button>
    )
}

export default RemindButton
