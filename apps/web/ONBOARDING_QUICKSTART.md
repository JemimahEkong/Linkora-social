# Onboarding System - Quick Start Guide

## For Developers

### Testing the Onboarding Flow

1. **Clear your browser state:**
   ```javascript
   // In browser console
   localStorage.clear();
   ```

2. **Connect your wallet** and visit the app

3. **Navigate to `/feed`** - you should be automatically redirected to `/onboarding`

4. **Complete the wizard** or skip it

### Integrating with Your Components

#### Check if onboarding is needed:

```tsx
import { useOnboarding } from "@/contexts/OnboardingContext";

function MyComponent() {
  const { shouldShowOnboarding } = useOnboarding();
  
  if (shouldShowOnboarding()) {
    return <div>Please complete onboarding first!</div>;
  }
  
  return <div>Your content...</div>;
}
```

#### Get onboarding state:

```tsx
import { useOnboarding } from "@/contexts/OnboardingContext";

function MyComponent() {
  const { state } = useOnboarding();
  
  console.log(state.isComplete); // boolean
  console.log(state.currentStep); // 0-4
  console.log(state.completedSteps); // object with step completion
  console.log(state.skipped); // boolean
}
```

#### Manually trigger onboarding:

```tsx
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/contexts/OnboardingContext";

function MyComponent() {
  const router = useRouter();
  const { resetOnboarding } = useOnboarding();
  
  const handleStartOnboarding = () => {
    resetOnboarding();
    router.push("/onboarding");
  };
  
  return (
    <button onClick={handleStartOnboarding}>
      Start Onboarding
    </button>
  );
}
```

#### Protect a page:

```tsx
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";

export default function MyPage() {
  return (
    <OnboardingGuard>
      <div>Protected content that requires onboarding...</div>
    </OnboardingGuard>
  );
}
```

### Accessing Onboarding Data

#### Profile Draft:

```tsx
import { useOnboardingProfile } from "@/hooks/useOnboardingProfile";

function ProfileComponent() {
  const { draft, submitProfile, loading } = useOnboardingProfile();
  
  if (draft) {
    console.log(draft.username);
    console.log(draft.displayName);
    console.log(draft.bio);
    console.log(draft.avatar);
  }
  
  const handleSubmit = async () => {
    await submitProfile();
    // Profile submitted to contract
  };
}
```

#### Initial Follows:

```javascript
const follows = JSON.parse(
  localStorage.getItem("linkora_initial_follows") || "[]"
);
console.log(follows); // ["GABC123", "GDEF456"]
```

#### Notification Preferences:

```javascript
const prefs = JSON.parse(
  localStorage.getItem("linkora_notification_prefs") || "{}"
);
console.log(prefs.pushEnabled);
console.log(prefs.preferences.likes);
```

## Customization

### Change Suggested Creators

Edit `apps/web/src/components/onboarding/wizard/FollowStep.tsx`:

```tsx
const SUGGESTED_CREATORS: Creator[] = [
  {
    address: "YOUR_ADDRESS",
    username: "your_username",
    bio: "Your bio here",
    followers: 100,
  },
];
```

### Modify Step Order

Edit `apps/web/src/components/onboarding/wizard/OnboardingWizard.tsx`:

```tsx
const STEPS = [
  { id: "welcome", label: "Welcome", component: WelcomeStep },
  // Add, remove, or reorder steps here
];
```

### Add New Step

1. Create component in `apps/web/src/components/onboarding/wizard/YourStep.tsx`
2. Add to STEPS array in OnboardingWizard.tsx
3. Update completedSteps in OnboardingContext.tsx

### Style Changes

Components use CSS custom properties. Override in your globals.css:

```css
:root {
  --onboarding-accent: #your-color;
}
```

Or use Tailwind classes directly in components.

## API Integration

### Connect Profile Creation

In `ProfileStep.tsx`, replace the TODO with your contract call:

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Your contract call here
  const client = new LinkoraClient({ contractId, rpcUrl });
  await client.setProfile({
    address,
    username: username.trim(),
    creator_token: address,
  });
  
  onNext();
};
```

### Connect Follow Functionality

In `FollowStep.tsx`, replace the TODO:

```tsx
const handleContinue = async () => {
  const client = new LinkoraClient({ contractId, rpcUrl });
  
  for (const creatorAddress of selectedCreators) {
    await client.follow(address, creatorAddress);
  }
  
  onNext();
};
```

## Testing Checklist

- [ ] New user redirects to onboarding
- [ ] Each step validates correctly
- [ ] Back button works
- [ ] Skip button works
- [ ] Progress persists on refresh
- [ ] Completion redirects to feed
- [ ] Settings shows correct status
- [ ] Restart works from settings
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] Keyboard navigation works

## Troubleshooting

**Onboarding not showing:**
- Check OnboardingProvider is in layout.tsx
- Verify wallet is connected
- Check browser console for errors

**State not persisting:**
- Check localStorage is enabled
- Try clearing and retrying
- Check browser privacy settings

**Styling broken:**
- Verify Tailwind is running
- Check CSS custom properties
- Clear build cache

## Support

For issues or questions:
1. Check the main README: `apps/web/src/components/onboarding/README.md`
2. Review implementation doc: `ONBOARDING_IMPLEMENTATION.md`
3. Check component files for inline documentation
