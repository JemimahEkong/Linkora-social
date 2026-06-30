# SearchBar Component

An enhanced search component with real-time suggestions, recent search history, and keyboard navigation.

## Features

### 1. **Debounced Search Suggestions**
- Suggestions appear as user types (300ms debounce)
- Searches profiles and hashtags
- Displays top 5 results per category
- Minimum 2 characters required for suggestions

### 2. **Recent Search History**
- Stores last 10 searches in localStorage
- Displays when search bar is focused with empty query
- Persists across page reloads and sessions
- Individual searches can be removed
- "Clear recent" option to remove all history

### 3. **Visual Highlights**
- Matching text is highlighted in suggestions
- Active suggestion has distinct background color
- Different icons for profiles, hashtags, and recent searches

### 4. **Keyboard Navigation**
- `↓` Arrow Down: Navigate to next suggestion
- `↑` Arrow Up: Navigate to previous suggestion
- `Enter`: Select active suggestion
- `Escape`: Close suggestions dropdown
- Full ARIA support for screen readers

### 5. **Suggestion Types**

#### Profile Suggestions
- Shows user's display name or username
- Gradient avatar with first letter
- "Profile" label for context

#### Hashtag Suggestions
- Appears when query starts with `#`
- Purple hashtag icon
- "Hashtag" label for context

#### Recent Searches
- Clock icon for visual distinction
- Remove button (X) on hover
- Sorted by most recent first

## Usage

```tsx
import SearchBar from "@/components/SearchBar";

function MyComponent() {
  const handleSearch = (query: string) => {
    console.log("Searching for:", query);
    // Navigate to search results or fetch data
  };

  return (
    <SearchBar
      onSearch={handleSearch}
      placeholder="Search profiles and posts..."
      initialValue=""
      className="w-full max-w-md"
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSearch` | `(query: string) => void` | Required | Callback when search is submitted |
| `placeholder` | `string` | `"Search posts..."` | Input placeholder text |
| `initialValue` | `string` | `""` | Initial search query value |
| `className` | `string` | `"w-full max-w-md"` | Container CSS classes |
| `inputClassName` | `string` | `""` | Input field CSS classes |
| `buttonLabel` | `string` | `"Search"` | Submit button text |

## Custom Hooks

### `useSearchSuggestions`

Manages fetching and caching of search suggestions with debouncing.

```tsx
const { suggestions, loading, fetchSuggestions, clearSuggestions } = useSearchSuggestions({
  debounceMs: 300,
  minQueryLength: 2,
  maxSuggestions: 5,
});
```

### `useRecentSearches`

Manages recent search history with localStorage persistence.

```tsx
const {
  recentSearches,
  addRecentSearch,
  clearRecentSearches,
  removeRecentSearch,
} = useRecentSearches(10); // max searches
```

## API Requirements

The component expects the following API endpoints:

### Profile Search
```
GET /api/profiles/search?q={query}&limit={limit}

Response:
{
  "profiles": [
    {
      "address": "string",
      "username": "string",
      "display_name": "string"
    }
  ]
}
```

## Accessibility

- Fully keyboard navigable
- ARIA roles and attributes for screen readers
- `role="search"` for form
- `role="listbox"` for suggestions dropdown
- `role="option"` for each suggestion
- `aria-expanded` indicates dropdown state
- `aria-activedescendant` tracks focused suggestion

## Browser Storage

Recent searches are stored in `localStorage` under the key `linkora_recent_searches` as a JSON array.

```json
["recent search 1", "recent search 2", ...]
```

## Performance

- Debounced API calls (300ms) reduce server load
- Request cancellation prevents race conditions
- Memoized highlight rendering
- Efficient state updates

## Styling

Uses CSS custom properties for theming:
- `--border`: Border color
- `--muted`: Muted background color
- `--card`: Card background color
- `--foreground`: Primary text color
- `--text-muted`: Secondary text color

## Testing

See `tests/e2e/search-suggestions.spec.ts` for comprehensive E2E tests covering:
- Recent searches display
- Real-time suggestions
- Text highlighting
- Keyboard navigation
- Click interactions
- localStorage persistence
- Loading states
- Error handling
