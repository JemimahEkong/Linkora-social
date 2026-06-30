# Onboarding System

A comprehensive multi-step onboarding wizard for new Linkora users.

## Overview

The onboarding system guides new users through setting up their profile, following creators, configuring notifications, and exploring featured content. It tracks completion status and allows users to skip or revisit the wizard at any time.

## Features

- **Multi-step wizard** with 5 progressive steps
- **Progress tracking** with visual indicators
- **Persistent state** using localStorage and context
- **Skip functionality** for advanced users
- **Revisit capability** from settings
- **Responsive design** works on mobile and desktop
- **Auto-redirect** for first-time users

## Architecture

### Context (`OnboardingContext.tsx`)

The onboarding state is managed globally using React Context:

```typescript
interface OnboardingState {
  isComplete: boolean;
  currentStep: number;
  completedSteps: {
    welcome: boolean;
    profile: boolean;
    follow: boolean;
    notifications: boolean;
    explore: boolean;
  };
  skipped: boolean;
}
```

State is persisted in `localStorage` under the key `linkora_onboarding_state`.

### Components

#### 1. **OnboardingWizard** (`wizard/OnboardingWizard.tsx`)
Main orchestrator component that renders the current step and manages navigation.

#### 2. **WelcomeStep** (`wizard/WelcomeStep.tsx`)
Introduction screen explaining Linkora's key features.

#### 3. **ProfileStep** (`wizard/ProfileStep.tsx`)
Profile creation form with:
- Username (required)
- Display name
- Bio (200 chars max)
- Avatar URL

#### 4. **FollowStep** (`wizard/FollowStep.tsx`)
Curated list of suggested creators to follow. Features:
- Multi-select interface
- Creator preview cards
- Follow count tracking

#### 5. **NotificationStep** (`wizard/NotificationStep.tsx`)
Notification preferences configuration:
- Browser push notifications toggle
- Individual preference controls (followers, likes, comments, tips, governance)

#### 6. **ExploreStep** (`wizard/ExploreStep.tsx`)
Featured posts preview and completion screen.

### Guards

#### **OnboardingGuard** (`OnboardingGuard.tsx`)
Wraps pages to automatically redirect new users to onboarding.

```tsx
<OnboardingGuard>
  <YourPageContent />
</OnboardingGuard>
```

### Settings Integration

#### **OnboardingSettings** (`../settings/OnboardingSettings.tsx`)
Settings panel showing:
- Completion status
- Completed steps checklist
- Restart button
- Continue button (if incomplete)

## Usage

### Setup

1. **Add OnboardingProvider to your app layout:**

```tsx
// app/layout.tsx
import { OnboardingProvider } from "@/contexts/OnboardingContext";

export default function RootLayout({ children }) {
  return (
    <OnboardingProvider>
      {children}
    </OnboardingProvider>
  );
}
```

2. **Protect pages with OnboardingGuard:**

```tsx
// app/feed/page.tsx
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";

export default function FeedPage() {
  return (
    <OnboardingGuard>
      <div>Your feed content...</div>
    </OnboardingGuard>
  );
}
```

3. **Access onboarding state in components:**

```tsx
import { useOnboarding } from "@/contexts/OnboardingContext";

function MyComponent() {
  const { state, shouldShowOnboarding, resetOnboarding } = useOnboarding();
  
  if (shouldShowOnboarding()) {
    return <div>Please complete onboarding</div>;
  }
  
  return <div>Welcome back!</div>;
}
```

## Routes

- `/onboarding` - Main onboarding wizard page
- `/settings` - Includes onboarding settings panel

## Storage Keys

- `linkora_onboarding_state` - Onboarding completion state
- `linkora_profile_draft` - Draft profile data from wizard
- `linkora_initial_follows` - Creators selected during onboarding
- `linkora_notification_prefs` - Notification preferences

## Customization

### Adding a New Step

1. Create a new step component in `wizard/`
2. Add it to the `STEPS` array in `OnboardingWizard.tsx`
3. Update the `completedSteps` interface in `OnboardingContext.tsx`
4. Update progress indicators

### Modifying Suggested Creators

Edit the `SUGGESTED_CREATORS` array in `wizard/FollowStep.tsx`:

```typescript
const SUGGESTED_CREATORS: Creator[] = [
  {
    address: "GABC123",
    username: "stellar_dev",
    bio: "Building the future...",
    followers: 1250,
  },
  // Add more...
];
```

### Styling

The components use CSS custom properties for theming:
- `--background` - Background color
- `--text` - Primary text color
- `--text-muted` - Secondary text color
- `--border` - Border color
- `--muted` - Muted background color

## Best Practices

1. **Don't force onboarding** - Always provide a skip option
2. **Save progress** - Persist state so users can continue later
3. **Keep it short** - 5 steps maximum
4. **Make it valuable** - Each step should provide clear benefit
5. **Allow revisiting** - Users should be able to restart from settings

## Future Enhancements

- [ ] On-chain onboarding state tracking
- [ ] Personalized creator recommendations based on interests
- [ ] Onboarding analytics and completion metrics
- [ ] A/B testing different onboarding flows
- [ ] Video tutorials in steps
- [ ] Gamification with rewards for completion
- [ ] Social proof (show community stats)

## Troubleshooting

### Onboarding not triggering
- Check that `OnboardingProvider` is in your layout
- Verify localStorage is enabled
- Check that the user is connected (wallet address exists)

### State not persisting
- Check browser localStorage permissions
- Verify JSON serialization is working
- Check for localStorage quota exceeded errors

### Styling issues
- Ensure Tailwind CSS is configured
- Check that CSS custom properties are defined
- Verify dark mode classes are working

## Contributing

When adding features to the onboarding system:
1. Update this README
2. Add tests for new functionality
3. Ensure responsive design works
4. Update TypeScript types as needed
