# Onboarding Flow Diagram

## User Journey

```mermaid
flowchart TD
    Start([User Visits App]) --> CheckWallet{Wallet Connected?}
    CheckWallet -->|No| ConnectPrompt[Show Connect Wallet]
    CheckWallet -->|Yes| CheckOnboarding{Onboarding Complete?}
    
    CheckOnboarding -->|Yes| Feed[Show Feed]
    CheckOnboarding -->|No| CheckProfile{Has Profile Draft?}
    
    CheckProfile -->|No| Welcome[Step 1: Welcome]
    CheckProfile -->|Yes| CheckStep{Check Current Step}
    
    Welcome --> Profile[Step 2: Create Profile]
    Profile --> Follow[Step 3: Follow Creators]
    Follow --> Notify[Step 4: Notifications]
    Notify --> Explore[Step 5: Explore]
    Explore --> Complete[Mark Complete]
    Complete --> Feed
    
    CheckStep --> Welcome
    CheckStep --> Profile
    CheckStep --> Follow
    CheckStep --> Notify
    CheckStep --> Explore
    
    Welcome -.Skip.-> SkipAll[Skip Onboarding]
    Profile -.Skip.-> SkipAll
    Follow -.Skip.-> SkipAll
    Notify -.Skip.-> SkipAll
    SkipAll --> Feed
    
    Feed --> Settings[User Opens Settings]
    Settings --> Restart{Click Restart?}
    Restart -->|Yes| ResetState[Reset State]
    ResetState --> Welcome
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> NotStarted
    NotStarted --> Welcome: Start Onboarding
    
    Welcome --> Profile: Next
    Welcome --> Skipped: Skip
    
    Profile --> Welcome: Back
    Profile --> Follow: Next
    Profile --> Skipped: Skip
    
    Follow --> Profile: Back
    Follow --> Notify: Next
    Follow --> Skipped: Skip
    
    Notify --> Follow: Back
    Notify --> Explore: Next
    Notify --> Skipped: Skip
    
    Explore --> Notify: Back
    Explore --> Complete: Finish
    
    Complete --> [*]
    Skipped --> [*]
    
    [*] --> Welcome: Restart from Settings
```

## Component Hierarchy

```mermaid
graph TD
    RootLayout[Root Layout]
    RootLayout --> OnboardingProvider
    OnboardingProvider --> App[App Content]
    
    App --> OnboardingPage[/onboarding]
    OnboardingPage --> Wizard[OnboardingWizard]
    
    Wizard --> Step1[WelcomeStep]
    Wizard --> Step2[ProfileStep]
    Wizard --> Step3[FollowStep]
    Wizard --> Step4[NotificationStep]
    Wizard --> Step5[ExploreStep]
    
    App --> FeedPage[/feed]
    FeedPage --> Guard[OnboardingGuard]
    Guard --> FeedContent[Feed Content]
    
    App --> SettingsPage[/settings]
    SettingsPage --> OnboardingSettings
    
    style OnboardingProvider fill:#e1d5f7
    style Wizard fill:#c7b8ea
    style Guard fill:#fde68a
```

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Guard as OnboardingGuard
    participant Context as OnboardingContext
    participant Storage as localStorage
    participant Wizard
    
    User->>Guard: Visit /feed
    Guard->>Context: Check shouldShowOnboarding()
    Context->>Storage: Get onboarding_state
    Storage-->>Context: Return state
    Context-->>Guard: needs_onboarding=true
    Guard->>User: Redirect to /onboarding
    
    User->>Wizard: Start Wizard
    Wizard->>Context: Get current step
    Context->>Storage: Get state
    Storage-->>Wizard: step=0
    
    User->>Wizard: Complete step
    Wizard->>Context: completeStep('welcome')
    Context->>Storage: Save state
    Wizard->>Context: setStep(1)
    Context->>Storage: Save state
    
    User->>Wizard: Finish last step
    Wizard->>Context: skipOnboarding()
    Context->>Storage: Save complete=true
    Wizard->>User: Redirect to /feed
    
    User->>Guard: Visit /feed
    Guard->>Context: Check shouldShowOnboarding()
    Context-->>Guard: needs_onboarding=false
    Guard->>User: Show feed
```

## Storage Schema

```mermaid
erDiagram
    ONBOARDING_STATE {
        boolean isComplete
        number currentStep
        object completedSteps
        boolean skipped
    }
    
    PROFILE_DRAFT {
        string username
        string displayName
        string bio
        string avatar
        string address
    }
    
    INITIAL_FOLLOWS {
        array addresses
    }
    
    NOTIFICATION_PREFS {
        boolean pushEnabled
        object preferences
    }
    
    ONBOARDING_STATE ||--o{ PROFILE_DRAFT : creates
    ONBOARDING_STATE ||--o{ INITIAL_FOLLOWS : generates
    ONBOARDING_STATE ||--o{ NOTIFICATION_PREFS : configures
```

## Step Progress

```mermaid
gantt
    title Onboarding Steps Timeline
    dateFormat X
    axisFormat %s
    
    section Welcome
    Welcome Screen: 0, 30s
    
    section Profile
    Fill Form: 30s, 120s
    Validation: 120s, 130s
    
    section Follow
    Browse Creators: 130s, 180s
    Select Follows: 180s, 210s
    
    section Notifications
    Review Options: 210s, 240s
    Enable Push: 240s, 250s
    Configure Prefs: 250s, 270s
    
    section Explore
    View Featured: 270s, 300s
    Complete: 300s, 310s
```

## Decision Tree

```mermaid
flowchart TD
    A[User Lands] --> B{Wallet?}
    B -->|No| C[Connect Flow]
    B -->|Yes| D{Profile?}
    
    D -->|No| E[Full Onboarding]
    D -->|Yes| F{Follows?}
    
    E --> G[Step 1-5]
    
    F -->|None| H[Skip to Follow Step]
    F -->|Some| I{Notifications?}
    
    I -->|Not Set| J[Skip to Notify Step]
    I -->|Set| K[Go to Feed]
    
    H --> L[Continue Wizard]
    J --> L
    G --> K
    L --> K
```

## Integration Points

```mermaid
graph LR
    Onboarding[Onboarding System]
    
    Onboarding --> Profile[Profile Contract]
    Onboarding --> Follow[Follow Contract]
    Onboarding --> Notif[Notification Service]
    Onboarding --> Indexer[Indexer API]
    
    Profile --> |setProfile| Contract[Smart Contract]
    Follow --> |follow| Contract
    Notif --> |subscribe| PushService[Push Service]
    Indexer --> |getSuggestions| Backend[Backend API]
    
    style Onboarding fill:#e1d5f7
    style Contract fill:#fca5a5
    style Backend fill:#a5f3fc
```

## Error Handling

```mermaid
flowchart TD
    Start[User Action] --> Try{Try Action}
    Try -->|Success| Save[Save State]
    Try -->|Error| Check{Error Type}
    
    Check -->|Validation| Show1[Show Validation Error]
    Check -->|Network| Show2[Show Network Error]
    Check -->|Contract| Show3[Show Contract Error]
    
    Show1 --> Retry1[Allow Retry]
    Show2 --> Retry2[Allow Retry]
    Show3 --> Retry3[Allow Skip]
    
    Retry1 --> Try
    Retry2 --> Try
    Retry3 --> Save
    
    Save --> Next[Proceed to Next]
```

---

## Legend

- **Solid lines** = Primary flow
- **Dashed lines** = Alternative/skip flow
- **Diamonds** = Decision points
- **Rectangles** = Actions/Steps
- **Ovals** = Start/End points
