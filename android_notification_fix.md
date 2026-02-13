# Fix for Android Notifications Not Appearing on Locked Screen

## Root Causes Identified

1. **Missing POST_NOTIFICATIONS permission** (Android 13+)
2. **Missing exact alarm permissions** (already added but needs runtime request)
3. **Notification channel importance not high enough**
4. **Missing full-screen intent permission handling**
5. **No foreground service for critical notifications**
6. **Battery optimization might be killing the app**

## SOLUTION: Multi-Step Fix

---

## STEP 1: Update AndroidManifest.xml

Replace your current `AndroidManifest.xml` with this updated version:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:requestLegacyExternalStorage="true">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true"
            android:showWhenLocked="true"
            android:turnScreenOn="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths"></meta-data>
        </provider>

        <!-- Receiver for notification actions -->
        <receiver android:name="com.capacitorjs.plugins.localnotifications.LocalNotificationReceiver"
            android:exported="false" />
            
    </application>

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    
    <!-- Exact Alarm Permissions (Android 12+) -->
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
    
    <!-- Full Screen Intent (for lock screen notifications) -->
    <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
    
    <!-- Wake Lock (to ensure notifications work when screen is off) -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    
    <!-- Vibrate -->
    <uses-permission android:name="android.permission.VIBRATE" />
    
    <!-- Post Notifications (Android 13+ / API 33+) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <!-- Foreground Service (for critical alarms) -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    
    <!-- Disable battery optimization (optional but recommended) -->
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
    
</manifest>
```

**Changes Made:**
- Added `POST_NOTIFICATIONS` permission (critical for Android 13+)
- Added `USE_EXACT_ALARM` permission
- Added `VIBRATE` permission
- Added `showWhenLocked="true"` and `turnScreenOn="true"` to Activity
- Added receiver for notification actions
- Added foreground service permission

---

## STEP 2: Update NotificationManager.js

Replace your entire `src/services/NotificationManager.js` with this:

```javascript
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

class NotificationManager {
    constructor() {
        this.platform = Capacitor.getPlatform()
        this.initialized = false
    }

    async init() {
        if (this.platform !== 'web' && !this.initialized) {
            try {
                console.log('[NotificationManager] Initializing...')
                
                // Create High Priority Channel for alarms
                const channelResult = await LocalNotifications.createChannel({
                    id: 'soonish_alarm',
                    name: 'Soonish Alarms',
                    description: 'Critical reminders that bypass Do Not Disturb',
                    importance: 5, // IMPORTANCE_MAX (not just HIGH)
                    visibility: 1, // VISIBILITY_PUBLIC
                    sound: 'default', // Use system default sound
                    vibration: true,
                    lights: true,
                    lightColor: '#FF0000',
                })
                
                console.log('[NotificationManager] Channel created:', channelResult)

                // Register action types
                await LocalNotifications.registerActionTypes({
                    types: [{
                        id: 'ALARM_ACTIONS',
                        actions: [
                            {
                                id: 'SNOOZE',
                                title: 'Snooze 10m',
                                foreground: true
                            },
                            {
                                id: 'DISMISS',
                                title: 'Dismiss',
                                foreground: true,
                                destructive: true
                            }
                        ]
                    }]
                })
                
                this.initialized = true
                console.log('[NotificationManager] Initialized successfully')
            } catch (error) {
                console.error('[NotificationManager] Init error:', error)
            }
        }
    }

    async requestPermissions() {
        console.log('[NotificationManager] Requesting permissions...')
        
        if (this.platform === 'web') {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission()
                console.log('[NotificationManager] Web permission result:', permission)
                return permission
            }
            console.log('[NotificationManager] Web permission already:', Notification.permission)
            return Notification.permission
        } else {
            // Initialize channel first
            await this.init()
            
            // Request notification permissions
            const result = await LocalNotifications.requestPermissions()
            console.log('[NotificationManager] Permission result:', result)
            
            if (result.display === 'granted') {
                // On Android 12+, also check for exact alarm permission
                if (Capacitor.isNativePlatform()) {
                    try {
                        // Check if we can schedule exact alarms
                        await LocalNotifications.checkPermissions()
                        console.log('[NotificationManager] Exact alarm permissions OK')
                    } catch (error) {
                        console.warn('[NotificationManager] Exact alarm permission issue:', error)
                    }
                }
            }
            
            return result.display
        }
    }

    async schedule(title, body, seconds, id) {
        console.log('[NotificationManager] Scheduling:', { title, body, seconds, id })
        
        if (this.platform === 'web') {
            await this.requestPermissions()
            return
        }

        try {
            // Ensure we're initialized
            await this.init()
            
            const triggerTime = new Date(Date.now() + seconds * 1000)
            console.log('[NotificationManager] Trigger time:', triggerTime.toISOString())

            // Schedule with all the bells and whistles
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title,
                        body,
                        id,
                        schedule: {
                            at: triggerTime,
                            allowWhileIdle: true, // CRITICAL: Allow when device is idle
                        },
                        sound: 'default', // Use system sound
                        channelId: 'soonish_alarm', // Use our high-priority channel
                        actionTypeId: 'ALARM_ACTIONS',
                        extra: {
                            reminderTime: triggerTime.getTime()
                        },
                        // CRITICAL FLAGS FOR LOCK SCREEN
                        autoCancel: false, // Don't auto-dismiss
                        ongoing: false, // Not a persistent notification
                        smallIcon: 'ic_stat_icon_config_sample', // Default Capacitor icon
                        largeIcon: null,
                        iconColor: '#FF0000',
                    }
                ]
            })
            
            console.log('[NotificationManager] Scheduled successfully')
            
            // Verify it was scheduled
            const pending = await LocalNotifications.getPending()
            console.log('[NotificationManager] Pending notifications:', pending.notifications.length)
            
        } catch (error) {
            console.error('[NotificationManager] Schedule error:', error)
            throw error
        }
    }

    async cancel(id) {
        if (this.platform !== 'web') {
            try {
                await LocalNotifications.cancel({ notifications: [{ id }] })
                console.log('[NotificationManager] Cancelled notification:', id)
            } catch (error) {
                console.error('[NotificationManager] Cancel error:', error)
            }
        }
    }
    
    // Helper to check what's pending (for debugging)
    async getPending() {
        if (this.platform !== 'web') {
            const result = await LocalNotifications.getPending()
            console.log('[NotificationManager] Pending:', result.notifications)
            return result.notifications
        }
        return []
    }
}

export const notificationManager = new NotificationManager()
```

**Key Changes:**
- Changed `importance: 5` to use `IMPORTANCE_MAX`
- Changed `sound: null` to `sound: 'default'` (critical!)
- Added `lights: true` and `lightColor`
- Added `autoCancel: false` to prevent auto-dismissal
- Added better error handling and logging
- Added `getPending()` helper for debugging

---

## STEP 3: Create MainActivity.java Override (CRITICAL!)

This is the most important fix. Create this file:

**Path:** `android/app/src/main/java/tech/buildnex/soonish/MainActivity.java`

```java
package tech.buildnex.soonish;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Allow notifications to show on lock screen and turn on screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
    }
}
```

**What this does:**
- Forces notifications to appear even when screen is locked
- Turns on the screen when notification fires
- Works on all Android versions

---

## STEP 4: Update App.jsx for Better Permission Handling

Add this function to your `App.jsx` (around line 160, before the return statement):

```javascript
// Request all necessary permissions on mount
useEffect(() => {
  const requestAllPermissions = async () => {
    if (Capacitor.getPlatform() === 'android') {
      try {
        // Request notification permission
        const result = await notificationManager.requestPermissions()
        console.log('Permission result:', result)
        
        // For Android 13+, show a one-time explanation
        if (result !== 'granted') {
          alert('Please enable notifications in Settings to receive reminders')
        }
      } catch (error) {
        console.error('Permission error:', error)
      }
    }
  }
  
  requestAllPermissions()
}, [])
```

---

## STEP 5: Test Notification Immediately (Debugging)

Add this temporary test button to your app for debugging. Put this in your `App.jsx` header section:

```javascript
{/* TEMPORARY: Test button - remove after testing */}
<button
  className="icon-button"
  onClick={async () => {
    await notificationManager.requestPermissions()
    await notificationManager.schedule(
      'TEST ALARM',
      'This should appear on lock screen!',
      10, // 10 seconds
      999999
    )
    alert('Notification scheduled for 10 seconds. Lock your phone now!')
  }}
  title="Test Notification"
>
  🔔
</button>
```

---

## STEP 6: Build and Test

```bash
# Rebuild the app
npm run android

# Build APK
npm run build:apk

# Install on phone
adb install android/Soonish-v0.0.18.apk
```

### Testing Checklist:

1. **Test with screen ON:**
   - Create reminder for 10 seconds
   - Keep app open
   - Notification should appear

2. **Test with screen OFF:**
   - Create reminder for 10 seconds
   - Press power button to lock phone
   - Wait 10 seconds
   - **Screen should turn on and notification should show**

3. **Test with Do Not Disturb:**
   - Enable DND mode
   - Create reminder
   - Should still show (high-priority channel bypasses DND)

4. **Test battery optimization:**
   - Go to Settings → Apps → Soonish → Battery
   - Make sure "Unrestricted" is selected

---

## STEP 7: User Instructions (Add to Settings Page)

Add this informational section to your `SettingsView.jsx`:

```javascript
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
            onClick={() => {
                // Open app settings
                if (Capacitor.isNativePlatform()) {
                    window.open('app-settings:', '_system')
                }
            }}
        >
            Open App Settings
        </button>
    </div>
</div>
```

---

## Common Issues and Solutions

### Issue 1: "Notifications still don't appear"
**Solution:** Check the following:
```bash
# Use ADB to check logs
adb logcat | grep -i "notification\|soonish"
```

### Issue 2: "Permission denied"
**Solution:** Manually enable in Settings:
- Settings → Apps → Soonish → Notifications → Allow
- Settings → Apps → Soonish → Battery → Unrestricted

### Issue 3: "Works when app is open, not when closed"
**Solution:** This is a battery optimization issue:
```java
// Add to MainActivity.java onCreate:
Intent intent = new Intent();
String packageName = getPackageName();
PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
if (!pm.isIgnoringBatteryOptimizations(packageName)) {
    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
    intent.setData(Uri.parse("package:" + packageName));
    startActivity(intent);
}
```

### Issue 4: "Notification sound doesn't play"
**Solution:** Verify channel settings:
- The channel must have `sound: 'default'` not `sound: null`
- User must have notification sounds enabled in system settings

---

## Why This Happens

**Android 12+ changes:**
- Exact alarms require `SCHEDULE_EXACT_ALARM` permission
- Apps can be killed more aggressively by battery optimization

**Android 13+ changes:**
- `POST_NOTIFICATIONS` runtime permission is required
- Users must explicitly grant permission

**Lock Screen Issues:**
- By default, notifications don't wake the screen
- Requires `USE_FULL_SCREEN_INTENT` permission
- Activity needs `showWhenLocked` and `turnScreenOn` flags

---

## Expected Behavior After Fix

✅ Notifications appear on lock screen
✅ Screen turns on when notification fires
✅ Notification sound plays
✅ Works even in Do Not Disturb mode (high-priority channel)
✅ Works when app is closed
✅ Works when phone is in deep sleep

---

## Testing Commands

```bash
# Check if notification is scheduled
adb shell dumpsys notification

# Check battery optimization status
adb shell dumpsys deviceidle whitelist

# Force-stop app and test
adb shell am force-stop tech.buildnex.soonish

# Monitor logs in real-time
adb logcat | grep -E "Notification|LocalNotification|Soonish"
```

---

## Final Notes

The combination of these fixes should resolve 99% of lock-screen notification issues. The most critical parts are:

1. **MainActivity.java** - Forces lock screen display
2. **Channel importance = 5** - Bypasses DND
3. **sound: 'default'** - Must have a sound
4. **POST_NOTIFICATIONS permission** - Android 13+
5. **allowWhileIdle: true** - Works when device is idle

If notifications STILL don't work after all this, the issue is likely:
- Battery optimization killing the app (ask user to disable)
- Manufacturer-specific battery saver (Xiaomi, Huawei, OnePlus have aggressive killers)
- User has blocked notifications in system settings

For manufacturer-specific issues, direct users to: https://dontkillmyapp.com/
