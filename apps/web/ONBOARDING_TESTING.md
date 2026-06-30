# Onboarding System - Testing Guide

## Pre-Testing Setup

### 1. Install Dependencies
```bash
cd apps/web
npm install
# or
pnpm install
```

### 2. Start Development Server
```bash
npm run dev
# or from root
pnpm dev
```

### 3. Clear Browser State
Open browser console and run:
```javascript
localStorage.clear();
location.reload();
```

## Manual Test Cases

### Test 1: First-Time User Experience

**Steps:**
1. Clear localStorage
2. Connect wallet
3. Navigate to `/feed`

**Expected:**
- ✓ Auto-redirect to `/onboarding`
- ✓ Welcome step displays
- ✓ Progress bar shows 1/5
- ✓ Skip button visible

**Screenshot Location:** Welcome step with progress bar

---

### Test 2: Welcome Step

**Steps:**
1. View welcome screen
2. Click feature cards (should be non-interactive)
3. Click "Let's Get Started"

**Expected:**
- ✓ Hero animation shows rocket emoji
- ✓ 3 feature preview cards visible
- ✓ Advances to Profile step
- ✓ Progress bar updates to 2/5

---

### Test 3: Profile Creation

**Steps:**
1. Leave username empty, try to submit
2. Enter short username (2 chars), check validation
3. Enter invalid username with spaces
4. Enter valid username
5. Fill optional fields
6. Click Continue

**Expected:**
- ✓ Shows "Username is required" error
- ✓ Shows "Username must be at least 3 characters" error
- ✓ Shows "Username may only contain letters, numbers, and underscores" error
- ✓ Avatar preview updates with first letter
- ✓ Bio character counter works (max 200)
- ✓ Advances to Follow step
- ✓ Progress bar updates to 3/5

---

### Test 4: Follow Creators

**Steps:**
1. View suggested creators
2. Click on various creator cards
3. Select 3 creators
4. Unselect 1 creator
5. Note the selection count
6. Click Continue

**Expected:**
- ✓ 6 curated creators displayed
- ✓ Cards toggle selection state (border, checkmark)
- ✓ Selection counter updates (shows "Selected: X")
- ✓ Can unselect previously selected creators
- ✓ Button shows count "(3 selected)"
- ✓ Advances to Notifications step
- ✓ Progress bar updates to 4/5

---

### Test 5: Notification Preferences

**Steps:**
1. View notification options
2. Try to enable push notifications
   - Grant permission
   - or Deny permission
3. Toggle individual preferences
4. Click Continue

**Expected:**
- ✓ 5 preference toggles displayed
- ✓ "Enable Push Notifications" button shows
- ✓ Browser permission dialog appears
- ✓ If granted: checkmark shows, button becomes checkmark
- ✓ If denied: error message shows
- ✓ Toggle switches animate smoothly
- ✓ Advances to Explore step
- ✓ Progress bar updates to 5/5

---

### Test 6: Explore & Completion

**Steps:**
1. View featured posts
2. Read completion message
3. Click "Start Using Linkora 🚀"

**Expected:**
- ✓ 3 featured posts displayed with engagement stats
- ✓ Completion celebration shows (🎉)
- ✓ Button has gradient background
- ✓ Redirects to `/feed`
- ✓ Feed page loads without redirect loop
- ✓ No longer redirects to onboarding

---

### Test 7: Skip Functionality

**Steps:**
1. Clear localStorage, start fresh
2. Begin onboarding
3. Click "Skip for now" on Welcome step
4. Verify redirect to feed

**Repeat for:**
- Profile step skip
- Follow step skip
- Notification step skip

**Expected:**
- ✓ Each step has Skip button
- ✓ Skip immediately redirects to feed
- ✓ Onboarding marked as complete
- ✓ No longer shows on subsequent visits

---

### Test 8: Back Navigation

**Steps:**
1. Start onboarding
2. Progress to Profile step
3. Click "Back" button
4. Progress to Follow step
5. Click "Back" button
6. Repeat through all steps

**Expected:**
- ✓ Back button returns to previous step
- ✓ Progress bar updates correctly
- ✓ Previous form data is preserved
- ✓ Step 1 (Welcome) has no back button
- ✓ Step 5 (Explore) has back button

---

### Test 9: State Persistence

**Steps:**
1. Start onboarding
2. Complete Profile step (save data)
3. Refresh the browser page (F5)
4. Check current step

**Expected:**
- ✓ Returns to correct step (Follow, step 3)
- ✓ Progress bar shows correct position
- ✓ Profile data is preserved in localStorage
- ✓ Can continue from where left off

---

### Test 10: Settings Integration

**Steps:**
1. Complete onboarding fully
2. Navigate to `/settings`
3. Scroll to Onboarding section
4. Verify status shows "Complete"
5. Click "Restart Onboarding Wizard"
6. Confirm dialog
7. Verify redirect to `/onboarding`

**Expected:**
- ✓ Status badge shows "✓ Complete"
- ✓ All steps show as completed (green checkmarks)
- ✓ "Restart" button visible
- ✓ Confirmation dialog appears
- ✓ Redirects to step 1
- ✓ State is reset

---

### Test 11: Incomplete Onboarding from Settings

**Steps:**
1. Start onboarding, stop at step 3
2. Navigate to `/settings` manually
3. Check onboarding section
4. Click "Continue Onboarding"

**Expected:**
- ✓ Status shows "In Progress (Step 3/5)"
- ✓ Steps 1-2 show as complete (green)
- ✓ Steps 3-5 show as incomplete
- ✓ "Continue Onboarding" button visible
- ✓ Clicking redirects to step 3

---

### Test 12: Empty Feed State

**Steps:**
1. Complete onboarding
2. Go to feed (should be empty initially)
3. Click on quick action cards

**Expected:**
- ✓ Empty state shows with star emoji
- ✓ 3 quick action cards visible
  - Create a Post
  - Explore
  - Edit Profile
- ✓ Each card links to correct page
- ✓ If onboarding incomplete, shows prompt

---

### Test 13: Mobile Responsiveness

**Steps:**
1. Open Chrome DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone 12 Pro"
4. Go through onboarding

**Expected:**
- ✓ Welcome screen readable on mobile
- ✓ Form inputs not cut off
- ✓ Creator cards stack vertically
- ✓ Buttons full width on mobile
- ✓ Progress bar readable
- ✓ All text legible

**Test also on:**
- iPad (768px)
- Small mobile (375px)
- Large desktop (1920px)

---

### Test 14: Dark Mode

**Steps:**
1. Complete onboarding in light mode
2. Switch to dark mode (if available)
3. Start fresh onboarding in dark mode
4. Go through all steps

**Expected:**
- ✓ All text readable in dark mode
- ✓ Backgrounds properly themed
- ✓ Borders visible
- ✓ No white flashes
- ✓ Gradient buttons work
- ✓ CSS custom properties applied

---

### Test 15: Form Validation Edge Cases

**Profile Step:**
```
Test Cases:
1. Username: ""                    → "Username is required"
2. Username: "ab"                  → "at least 3 characters"
3. Username: "a".repeat(33)        → "32 characters or fewer"
4. Username: "user name"           → "only letters, numbers, and underscores"
5. Username: "user@123"            → "only letters, numbers, and underscores"
6. Username: "valid_user_123"      → ✓ Valid
7. Bio: "a".repeat(201)            → Counter shows 201/200 (warn user)
8. Avatar: "not-a-url"             → No validation (optional field)
```

---

### Test 16: Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari
- [ ] Mobile Chrome

**Check:**
- localStorage works
- Notifications permission works
- CSS Grid/Flexbox layouts
- Animations smooth
- No console errors

---

### Test 17: Accessibility

**Keyboard Navigation:**
1. Start onboarding
2. Use Tab key to navigate
3. Use Enter to submit forms
4. Use Space to toggle checkboxes

**Expected:**
- ✓ Focus indicators visible
- ✓ Logical tab order
- ✓ No keyboard traps
- ✓ Skip links work
- ✓ Forms submittable via Enter

**Screen Reader:**
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Navigate through wizard
3. Fill out forms

**Expected:**
- ✓ ARIA labels read correctly
- ✓ Error messages announced
- ✓ Button purposes clear
- ✓ Progress described

---

### Test 18: Performance

**Metrics to check:**
1. Time to first paint
2. Bundle size impact
3. localStorage operations speed
4. Animation smoothness (60fps)
5. Memory usage

**Tools:**
- Chrome DevTools Performance tab
- Lighthouse audit
- React DevTools Profiler

---

### Test 19: Error Handling

**Simulate errors:**
1. localStorage disabled
   ```javascript
   // In console
   localStorage.setItem = () => { throw new Error("Disabled"); };
   ```
2. Network offline (DevTools → Network → Offline)
3. Corrupt localStorage data
   ```javascript
   localStorage.setItem('linkora_onboarding_state', 'invalid json{');
   ```

**Expected:**
- ✓ Graceful degradation
- ✓ Error messages displayed
- ✓ No app crashes
- ✓ Can retry or skip

---

### Test 20: Integration Points

**TODO (when connecting to backend):**
1. Profile creation submits to contract
2. Follow requests sent to contract
3. Notification preferences saved to backend
4. Creator suggestions fetched from API
5. On-chain state tracking (optional)

---

## Automated Testing (TODO)

### Unit Tests
```typescript
// Example tests to write
describe('OnboardingContext', () => {
  it('initializes with default state', () => {});
  it('persists state to localStorage', () => {});
  it('completes a step', () => {});
  it('skips onboarding', () => {});
  it('resets state', () => {});
});

describe('ProfileStep', () => {
  it('validates username', () => {});
  it('shows errors for invalid input', () => {});
  it('disables submit when invalid', () => {});
  it('saves draft on submit', () => {});
});
```

### Integration Tests
```typescript
describe('Onboarding Flow', () => {
  it('redirects new user to onboarding', () => {});
  it('completes full wizard flow', () => {});
  it('allows skipping', () => {});
  it('persists on refresh', () => {});
  it('redirects to feed on completion', () => {});
});
```

### E2E Tests (Playwright)
```typescript
test('complete onboarding journey', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Connect Wallet');
  // ... rest of flow
  await expect(page).toHaveURL('/feed');
});
```

---

## Test Data

### Valid Test Inputs
```json
{
  "username": "test_user_123",
  "displayName": "Test User",
  "bio": "Just testing the onboarding system",
  "avatar": "https://via.placeholder.com/150"
}
```

### Invalid Test Inputs
```json
{
  "username": "ab",  // too short
  "username": "user name",  // has space
  "username": "a".repeat(33),  // too long
  "bio": "a".repeat(201)  // exceeds limit
}
```

---

## Regression Tests

After making changes, verify:
- [ ] Existing onboarding still works
- [ ] Settings integration unaffected
- [ ] Feed guard still redirects
- [ ] State persistence intact
- [ ] Mobile layout unchanged
- [ ] No new console errors

---

## Bug Report Template

```markdown
**Bug:** [Brief description]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**


**Actual Behavior:**


**Environment:**
- Browser: 
- OS: 
- Screen size: 
- Dark mode: Yes/No

**Console Errors:**


**Screenshots:**

```

---

## Coverage Goals

- [ ] 80%+ unit test coverage
- [ ] All critical paths E2E tested
- [ ] Accessibility audit passing
- [ ] Performance budget met
- [ ] No critical bugs
- [ ] Cross-browser tested

---

## Sign-Off Checklist

Before marking onboarding as production-ready:

- [ ] All test cases pass
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] Accessibility compliant
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Product approved
- [ ] Analytics integrated

---

**Last Updated:** 2026-06-27  
**Status:** Ready for Testing
