# Soonish App - Feature Implementation Prompt for Google Gemini

## Context
You are working on **Soonish**, a minimalist same-day reminder app built with React, Vite, and Capacitor. The app allows users to create quick reminders for 30m, 1h, 2h, and 3h durations. Users can snooze, dismiss, or defer reminders to the next day.

## Current Tech Stack
- **Frontend**: React 19.2.0 with Vite
- **Mobile**: Capacitor 8.0.2 (Android support)
- **Notifications**: @capacitor/local-notifications 8.0.0
- **Styling**: Plain CSS with CSS variables
- **State Management**: React hooks (useState, useEffect)
- **Persistence**: localStorage

## Current Code Structure
```
src/
├── App.jsx (main component with state management)
├── App.css
├── components/
│   ├── ReminderInput.jsx
│   ├── TimeSelector.jsx
│   ├── RemindButton.jsx
│   ├── ReminderList.jsx
│   ├── SettingsView.jsx
│   └── Footer.jsx
└── services/
    └── NotificationManager.js
```

## Issues Identified

### 1. **Snooze Duration Hardcoded**
- Current: Snooze button always adds 30 minutes (line 18 in ReminderList.jsx)
- Problem: No user control over snooze duration

### 2. **No Visual Feedback for Due Reminders**
- Current: When `remaining === 0`, shows "Due!" text only
- Problem: Easy to miss due reminders in the list

### 3. **No Completed Reminders Cleanup**
- Current: Dismissed reminders stay in localStorage forever
- Problem: Could accumulate junk data over time

### 4. **Limited Time Presets**
- Current: Only 30m, 1h, 2h, 3h
- User feedback: 15m and 45m are commonly needed

## Implementation Tasks

### **PRIORITY 1: Configurable Snooze Duration** ⏰

**Requirements:**
- Replace single "Snooze" button with 3 quick-action buttons
- Options: +15m, +30m, +1h
- Keep UI compact and inline (no dropdowns or modals)
- Maintain existing snooze logic in App.jsx (lines 102-124)

**Implementation Steps:**

1. **Modify ReminderList.jsx** (lines 17-20):
```jsx
// REPLACE THIS:
<button className="action-btn snooze" onClick={() => onSnooze(reminder.id)}>
    Snooze
</button>

// WITH THIS:
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
```

2. **Add CSS to ReminderList.css**:
```css
.snooze-actions {
  display: flex;
  gap: 6px;
}

.action-btn.snooze-quick {
  padding: 6px 10px;
  font-size: 12px;
  min-width: 50px;
  background: rgba(255, 193, 7, 0.15);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 6px;
  color: #ffc107;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.snooze-quick:hover {
  background: rgba(255, 193, 7, 0.25);
  transform: translateY(-1px);
}

.action-btn.snooze-quick:active {
  transform: translateY(0);
}
```

3. **Ensure App.jsx handleSnooze function accepts minutes parameter** (already implemented on line 102)

---

### **PRIORITY 2: Visual Alert for Due Reminders** 🔴

**Requirements:**
- Highlight reminders when `remaining === 0`
- Use pulsing animation + colored left border
- Should be attention-grabbing but not annoying

**Implementation Steps:**

1. **Modify ReminderList.jsx** (line 11):
```jsx
// REPLACE THIS:
<div key={reminder.id} className="reminder-item">

// WITH THIS:
<div 
  key={reminder.id} 
  className={`reminder-item ${reminder.remaining === 0 ? 'due' : ''}`}
>
```

2. **Add CSS animations to ReminderList.css**:
```css
/* Pulsing animation */
@keyframes pulse {
  0%, 100% {
    background: rgba(255, 68, 68, 0.1);
  }
  50% {
    background: rgba(255, 68, 68, 0.2);
  }
}

@keyframes border-pulse {
  0%, 100% {
    border-left-color: #ff4444;
  }
  50% {
    border-left-color: #ff6666;
  }
}

/* Due reminder styles */
.reminder-item.due {
  animation: pulse 2s ease-in-out infinite;
  border-left: 4px solid #ff4444;
  animation: pulse 2s ease-in-out infinite, 
             border-pulse 2s ease-in-out infinite;
}

.reminder-item.due .reminder-time {
  color: #ff4444;
  font-weight: 700;
  text-transform: uppercase;
}
```

---

### **PRIORITY 3: Add 15m and 45m Time Presets** ⚡

**Requirements:**
- Add 15m button before 30m
- Add 45m button between 30m and 1h
- Maintain same visual style

**Implementation Steps:**

1. **Modify TimeSelector.jsx** (lines 4-9):
```jsx
// REPLACE THIS:
const options = [
    { label: '30m', value: 30 },
    { label: '1h', value: 60 },
    { label: '2h', value: 120 },
    { label: '3h', value: 180 },
]

// WITH THIS:
const options = [
    { label: '15m', value: 15 },
    { label: '30m', value: 30 },
    { label: '45m', value: 45 },
    { label: '1h', value: 60 },
    { label: '2h', value: 120 },
    { label: '3h', value: 180 },
]
```

2. **Adjust TimeSelector.css** (if pills become too crowded):
```css
.time-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap; /* Allow wrapping on small screens */
  justify-content: center;
}

.time-pill {
  padding: 10px 16px; /* Reduce padding slightly if needed */
  font-size: 14px;
}

/* Stack vertically on very small screens */
@media (max-width: 360px) {
  .time-selector {
    flex-direction: column;
  }
  
  .time-pill {
    width: 100%;
  }
}
```

---

### **BONUS: Auto-cleanup Old Reminders** 🗂️

**Requirements:**
- Remove completed reminders at midnight each day
- Only cleanup reminders with `remaining === 0` that were dismissed

**Implementation Steps:**

1. **Add cleanup effect to App.jsx** (after line 57):
```jsx
// Auto-cleanup dismissed reminders at midnight
useEffect(() => {
  const scheduleMidnightCleanup = () => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const msUntilMidnight = midnight - now

    return setTimeout(() => {
      // Remove reminders that have been completed (remaining === 0)
      setReminders(prev => {
        const cleaned = prev.filter(r => r.remaining > 0)
        console.log(`Cleaned up ${prev.length - cleaned.length} old reminders`)
        return cleaned
      })
      
      // Schedule next cleanup
      scheduleMidnightCleanup()
    }, msUntilMidnight)
  }

  const timer = scheduleMidnightCleanup()
  return () => clearTimeout(timer)
}, [])
```

---

## Testing Checklist

After implementing these features, verify:

### Snooze Feature:
- [ ] All three snooze buttons (+15m, +30m, +1h) appear for each reminder
- [ ] Clicking each button correctly updates the reminder's target time
- [ ] Notification is rescheduled properly (check native notifications on Android)
- [ ] Snooze buttons are disabled when reminder is already due

### Due Reminder Highlighting:
- [ ] Reminder pulses when countdown reaches 0
- [ ] Red left border appears on due reminders
- [ ] "Due!" text is displayed in red and bold
- [ ] Animation is smooth and not performance-intensive

### Time Presets:
- [ ] 15m button appears and works correctly
- [ ] 45m button appears and works correctly
- [ ] All 6 time options are properly spaced
- [ ] Layout remains responsive on mobile (test on 360px width)

### Auto-cleanup:
- [ ] Create a reminder, mark it done, wait until next day - should be removed
- [ ] Active reminders (remaining > 0) are NOT removed at midnight
- [ ] Check localStorage to ensure cleanup actually removes data

---

## Design Principles to Maintain

1. **Minimalism**: Don't add complex UI elements or modals
2. **Speed**: User should be able to create reminder in 2 taps
3. **Visual Clarity**: Use subtle colors and animations
4. **Mobile-First**: Ensure everything works on small screens (320px+)
5. **No Feature Creep**: Stick to the specified features only

---

## File Modification Summary

**Files to Modify:**
1. `src/components/ReminderList.jsx` - Snooze buttons + due highlighting
2. `src/components/ReminderList.css` - Snooze styling + animation
3. `src/components/TimeSelector.jsx` - Add 15m and 45m options
4. `src/components/TimeSelector.css` - Responsive adjustments
5. `src/App.jsx` - Add midnight cleanup effect

**Files NOT to Modify:**
- `NotificationManager.js` (already handles scheduling correctly)
- `SettingsView.jsx` (no changes needed)
- `ReminderInput.jsx` (no changes needed)
- `RemindButton.jsx` (no changes needed)

---

## Expected Behavior After Implementation

### Before:
- User clicks "Snooze" → Always adds 30 minutes
- Due reminders blend in with active ones
- Only 4 time preset options
- Old completed reminders accumulate

### After:
- User sees 3 snooze options (+15m, +30m, +1h) → Chooses appropriate duration
- Due reminders pulse with red border → Impossible to miss
- 6 time preset options including 15m and 45m → More flexibility
- Completed reminders auto-cleanup at midnight → Clean storage

---

## Additional Context

**App Philosophy:**
Soonish is designed for ADHD/neurodivergent users who need:
- Quick, frictionless reminder creation
- Visual clarity (knowing what's urgent vs. upcoming)
- Flexible snoozing (tasks don't always take 30 minutes)
- Clean interface without overwhelming options

**Performance Considerations:**
- Keep animations at 60fps (use CSS transforms, not layout properties)
- Ensure timer loop (line 38-57 in App.jsx) doesn't cause performance issues
- Test on low-end Android devices (2GB RAM)

**Accessibility:**
- Add `aria-label` attributes to snooze buttons
- Ensure color contrast meets WCAG AA standards (4.5:1)
- Test with screen readers (TalkBack on Android)

---

## Questions to Consider

1. Should we add haptic feedback when snoozing? (Capacitor has Haptics plugin)
2. Should "Done" button require confirmation for reminders that aren't due yet?
3. Should we show a toast notification when auto-cleanup happens?
4. Should snooze buttons be hidden when reminder is in future (not due yet)?

**Recommended Answers:**
1. Yes - add light haptic on snooze (10-20ms)
2. No - keep it quick, user can undo by recreating
3. No - silent cleanup is better (less intrusive)
4. No - let users pre-snooze if they want (flexibility)

---

## Code Style Guidelines

- Use functional components with hooks
- Keep components under 100 lines
- Use destructuring for props
- Use ternary operators for conditional classes
- Add comments only for complex logic
- Use meaningful variable names (no `tmp`, `x`, `data`)

---

## Deployment Notes

After implementing features:

1. **Test on Web:**
```bash
npm run dev
```

2. **Build for Android:**
```bash
npm run android
npm run build:apk
```

3. **Version Bump:**
The `package.json` is already at v0.0.17. After these changes, bump to v0.0.18 or v0.1.0 (since these are user-facing features).

---

## Success Criteria

Implementation is complete when:
✅ All 3 snooze buttons work correctly
✅ Due reminders have pulsing animation
✅ 6 time presets available (15m, 30m, 45m, 1h, 2h, 3h)
✅ Auto-cleanup runs at midnight without errors
✅ No console errors or warnings
✅ App size remains under 500KB (post-build)
✅ Animations run smoothly at 60fps
✅ Works on web and Android

---

## Final Notes

This implementation maintains the minimalist philosophy while addressing real usability gaps. Focus on polish and performance over feature quantity. Test thoroughly on mobile devices since that's the primary use case.

If you have questions about specific implementation details, refer to the existing code patterns in the current codebase. The app uses a straightforward React patterns—no complex state management or routing needed.

Good luck with the implementation! 🚀
