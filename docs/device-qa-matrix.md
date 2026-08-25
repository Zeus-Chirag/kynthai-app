# Kynthai — Device QA Matrix

## Test Devices Required

| Device | OS | Screen | Priority |
|--------|-----|--------|----------|
| iPhone 14/15/16 | iOS 17/18 | 6.1" | P0 |
| iPhone SE | iOS 17+ | 4.7" | P1 |
| Samsung Galaxy S23/S24 | Android 14/15 | 6.1" | P0 |
| Samsung Galaxy A54 | Android 14 | 6.4" | P1 |
| Google Pixel 7/8 | Android 14/15 | 6.1" | P0 |
| OnePlus 12 | Android 14 | 6.8" | P2 |
| iPad Air | iPadOS 17+ | 10.9" | P1 |

## Test Scenarios — All Roles

### Patient Role

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Login | Enter credentials, tap Sign In | Dashboard loads, medications visible |
| Add medication | Tap +, enter name/dosage/frequency | Medication appears in list |
| Mark dose taken | Tap checkmark on due reminder | Status changes to "taken" |
| Missed dose alert | Wait past reminder window | Notification appears, family alerted |
| Drug interaction | Add two conflicting meds | Warning shown |
| AI chat | Ask "What is Metformin?" | AI responds with info |
| Book appointment | Select doctor, pick time | Confirmation shown |
| View lab results | Navigate to Lab tab | Results displayed |

### Doctor Role

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Login | Enter credentials | Doctor dashboard loads |
| View appointments | Navigate to Appointments tab | List of upcoming appointments |
| Accept appointment | Tap Accept on pending appointment | Status changes to confirmed |
| Write prescription | Select patient, add medications | Prescription saved |
| Download PDF | Tap PDF on prescription | File downloads/open in browser |
| Video call | Start video consultation | Video call connects |

### Lab Role

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Login | Enter credentials | Lab dashboard loads |
| View bookings | Navigate to Bookings tab | List of bookings |
| Mark complete | Update booking status | Patient notified |
| Upload results | Upload lab report | Patient can view results |

### Caretaker/Family Role

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Login | Enter credentials | Family portal loads |
| View family | Navigate to Family tab | Family members listed |
| Add member | Add new family member | Member appears in list |
| View pulse | Check family health pulse | Health data displayed |
| SOS alert | Trigger SOS | Emergency contacts notified |

## Critical Path Tests (Must Pass)

| Test | Device | Role | Priority |
|------|--------|------|----------|
| Login → Dashboard | All | All | P0 |
| Medication reminder fires | All | Patient | P0 |
| Push notification received | All | All | P0 |
| Dose taken → family notified | All | Patient | P0 |
| Appointment booking flow | All | Patient | P0 |
| Prescription PDF download | All | Doctor | P0 |
| Lab result upload | All | Lab | P0 |
| SOS alert delivery | All | Caretaker | P0 |

## App Killed Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Background push | Close app, wait for reminder | Push notification appears |
| Killed push | Force-kill app, wait for reminder | Push notification appears |
| Re-open after kill | Force-kill, re-open app | Dashboard loads, reminders shown |
| Deep link from notification | Tap push notification | App opens to correct screen |

## Dark Mode Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Toggle dark mode | Settings → Dark mode | All screens switch correctly |
| Dark mode persistence | Toggle, close app, reopen | Dark mode persists |
| Dark mode + notifications | Receive notification in dark mode | Notification renders correctly |

## Network Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Offline mode | Turn off WiFi/data | App shows cached data |
| Reconnect | Turn on WiFi/data | App syncs, new data appears |
| Slow connection | Throttle to 3G | App loads (slowly) |
| No connection + reminder | Offline, wait for reminder | In-app alarm fires |

## Accessibility Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Font size | Increase system font | All text scales correctly |
| Screen reader | Enable VoiceOver/TalkBack | All elements labeled |
| Tap targets | Test all buttons | All ≥ 44px |
| Color contrast | Check all text | WCAG AA compliant |

## Test Checklist Template

```
Device: _______________
OS Version: _______________
Date: _______________
Tester: _______________

[ ] Login works
[ ] Dashboard loads
[ ] Medications display correctly
[ ] Reminders fire at correct time
[ ] Push notifications received
[ ] Dark mode works
[ ] All tabs navigate correctly
[ ] No crashes or errors
[ ] No layout overflow on small screens
[ ] All buttons are tappable (≥ 44px)
```
