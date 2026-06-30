# Onboarding System Implementation

## Overview

This document describes the implementation of a comprehensive multi-step onboarding wizard for new Linkora users.

## Problem Statement

**Problem:** New users are dropped into an empty feed with no guidance.

**Solution:** Multi-step onboarding wizard on first visit that guides users through:
1. Welcome + Create profile (avatar, bio, display name)
2. Follow suggested creators (curated list)
3. Set notification preferences
4. Explore featured posts
5. Track completion status in local storage / on-chain profile
6. Allow skipping and revisiting from settings

## Implementation Details

### 1. Context Management

**File:** `apps/web/src/contexts/OnboardingContext.tsx`

- Global state management for onboarding progress
- Persists state to localStorage
- Tracks completion of each step
- Provides hooks for components to interact with onboarding state

**Key Features:**
- `OnboardingProvider` - Wraps the app to provide onboarding state
- `useOnboarding()` - Hook to access onboarding state and actions
- Automatic localStorage persistence
- Reset functionality

### 2. Wizard Steps

**Location:** `apps/web/src/components/onboarding/wizard/`

#### Step 1: Welcome (`WelcomeStep.tsx`)
- Hero introduction with animated rocket emoji
- Feature preview cards (Profile, Connect, Earn & Tip)
- "Get Started" or "Skip" options

#### Step 2: Profile (`ProfileStep.tsx`)
- Username input with validation
- Display name (optional)
- Bio textarea (200 character limit)
- Avatar URL input
- Live avatar preview
- Form validation with error messages

#### Step 3: Follow Creators (`FollowStep.tsx`)
- Curated list of 6 suggested creators
- Multi-select card interface
- Visual checkmarks for selected creators
- Selection counter
- Stores selections in localStorage

#### Step 4: Notifications (`NotificationStep.tsx`)
- Master push notification toggle with browser permission request
- Individual preference toggles:
  - New followers
  - Likes on posts
  - Comments/replies
  - Tips received
  - Governance updates
- Toggle switches with smooth animations
- Saves to localStorage

#### Step 5: Explore (`ExploreStep.tsx`)
- Featured posts preview (3 trending posts)
- Completion celebration screen
- "Start Using Linkora" button
- Auto-redirect to feed on completion

### 3. Main Wizard Orchestrator

**File:** `apps/web/src/components/onboarding/wizard/OnboardingWizard.tsx`

- Manages step navigation
- Progress bar with step indicators
- Step completion tracking
- Back/Next/Skip button handling
- Responsive layout for mobile and desktop

**Features:**
- Visual progress bar with 5 segments
- Step labels showing current position
- Skip button in top-right corner
- Footer with help links

### 4. Routing

**File:** `apps/web/src/app/onboarding/page.tsx`

- Protected route requiring wallet connection
- Redirects to feed if onboarding is complete
- Renders OnboardingWizard component

### 5. Onboarding Guard

**File:** `apps/web/src/components/onboarding/OnboardingGuard.tsx`

- Client component that wraps pages
- Checks if user needs onboarding
- Auto-redirects new users to `/onboarding`
- Checks for profile draft to identify first-time users

**Usage:**
```tsx
<OnboardingGuard>
  <FeedPage />
</OnboardingGuard>
```

### 6. Settings Integration

**File:** `apps/web/src/components/settings/OnboardingSettings.tsx`

Settings panel showing:
- Completion status badge
- Completed steps checklist
- Continue button (if incomplete)
- Restart button to reset and re-run wizard
- Informational help text

### 7. Empty State Component

**File:** `apps/web/src/components/EmptyFeedState.tsx`

- Shows when feed is empty
- Different variants for "following" and "explore" tabs
- Quick action cards (Create Post, Explore, Edit Profile)
- Prompts incomplete users to finish onboarding
- Responsive grid layout

### 8. Layout Integration

**File:** `apps/web/src/app/layout.tsx`

Added `OnboardingProvider` to app layout:
```tsx
<OnboardingProvider>
  <NotificationsProvider>
    {/* ... */}
  </NotificationsProvider>
</OnboardingProvider>
```

### 9. Feed Page Updates

**File:** `apps/web/src/app/feed/page.tsx`

- Wrapped with `OnboardingGuard`
- Auto-redirects new users
- Maintains existing functionality

## Data Flow

```
User connects wallet
     ↓
OnboardingGuard checks status
     ↓
New user? → Redirect to /onboarding
     ↓
OnboardingWizard renders current step
     ↓
User completes steps (state saved to localStorage)
     ↓
Profile data, follows, preferences saved
     ↓
Redirect to /feed
     ↓
Normal app experience
```

## Storage Schema

### `linkora_onboarding_state`
```json
{
  "isComplete": false,
  "currentStep": 2,
  "completedSteps": {
    "welcome": true,
    "profile": true,
    "follow": false,
    "notifications": false,
    "explore": false
  },
  "skipped": false
}
```

### `linkora_profile_draft`
```json
{
  "username": "alice_stellar",
  "displayName": "Alice Johnson",
  "bio": "Crypto enthusiast and developer",
  "avatar": "https://example.com/avatar.jpg",
  "address": "GABC..."
}
```

### `linkora_initial_follows`
```json
["GABC123", "GDEF456", "GHIJ789"]
```

### `linkora_notification_prefs`
```json
{
  "pushEnabled": true,
  "preferences": {
    "newFollowers": true,
    "likes": true,
    "comments": true,
    "tips": true,
    "governance": false
  }
}
```

## Key Features

✅ **Multi-step wizard** with 5 progressive steps  
✅ **Progress tracking** with visual indicators  
✅ **Skip functionality** for power users  
✅ **Resume capability** - users can continue where they left off  
✅ **Settings integration** - restart/continue from settings  
✅ **Local storage persistence** - survives page refreshes  
✅ **Auto-redirect** - new users automatically enter wizard  
✅ **Responsive design** - works on mobile and desktop  
✅ **Form validation** - username validation with error messages  
✅ **Curated suggestions** - hand-picked creators to follow  
✅ **Browser notifications** - proper permission handling  
✅ **Empty states** - helpful prompts when feed is empty  
✅ **Dark mode support** - uses CSS custom properties  

## Future Enhancements

### Short Term
- [ ] Connect profile creation to actual contract
- [ ] Implement real follow functionality
- [ ] Add avatar upload capability
- [ ] Fetch real creator suggestions from backend
- [ ] Add success animations

### Medium Term
- [ ] On-chain onboarding state tracking
- [ ] Interest-based creator recommendations
- [ ] Onboarding completion analytics
- [ ] A/B test different flows
- [ ] Add video tutorials

### Long Term
- [ ] Gamification with rewards
- [ ] Social proof (show community stats)
- [ ] Personalized onboarding based on user type
- [ ] Multi-language support
- [ ] Accessibility improvements

## Testing

To test the onboarding wizard:

1. **First-time experience:**
   ```
   - Clear localStorage
   - Connect wallet
   - Visit /feed
   - Should redirect to /onboarding
   ```

2. **Step navigation:**
   ```
   - Complete each step
   - Try back button
   - Refresh page (state should persist)
   - Try skip button
   ```

3. **Settings:**
   ```
   - Complete onboarding
   - Go to /settings
   - Check status shows "Complete"
   - Try restart button
   ```

4. **Guard behavior:**
   ```
   - Complete onboarding
   - Visit /feed
   - Should not redirect
   - Clear localStorage
   - Visit /feed
   - Should redirect to /onboarding
   ```

## Files Changed/Created

### Created
- `apps/web/src/contexts/OnboardingContext.tsx`
- `apps/web/src/components/onboarding/wizard/OnboardingWizard.tsx`
- `apps/web/src/components/onboarding/wizard/WelcomeStep.tsx`
- `apps/web/src/components/onboarding/wizard/ProfileStep.tsx`
- `apps/web/src/components/onboarding/wizard/FollowStep.tsx`
- `apps/web/src/components/onboarding/wizard/NotificationStep.tsx`
- `apps/web/src/components/onboarding/wizard/ExploreStep.tsx`
- `apps/web/src/components/onboarding/wizard/index.tsx`
- `apps/web/src/components/onboarding/OnboardingGuard.tsx`
- `apps/web/src/components/onboarding/README.md`
- `apps/web/src/components/settings/OnboardingSettings.tsx`
- `apps/web/src/components/EmptyFeedState.tsx`
- `apps/web/src/app/onboarding/page.tsx`

### Modified
- `apps/web/src/app/layout.tsx` - Added OnboardingProvider
- `apps/web/src/app/feed/page.tsx` - Added OnboardingGuard
- `apps/web/src/app/settings/page.tsx` - Added OnboardingSettings

## Dependencies

No new dependencies required. Uses existing:
- React Context API
- Next.js App Router
- Tailwind CSS
- Existing validation utilities (`@/lib/validate`)
- Existing hooks (`useWallet`)

## Browser Compatibility

- Modern browsers with localStorage support
- Push Notifications API (optional, gracefully degrades)
- ES6+ JavaScript features
- Responsive CSS Grid and Flexbox

## Accessibility

- Semantic HTML elements
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators
- Color contrast compliance
- Screen reader friendly

## Performance

- Lazy loading of wizard steps
- Minimal bundle size impact
- Efficient localStorage operations
- No network requests during wizard (mock data)
- Smooth animations with CSS transitions

---

**Status:** ✅ Implementation Complete  
**Date:** 2026-06-27  
**Version:** 1.0.0
