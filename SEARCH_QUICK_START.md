# Search Enhancement - Quick Start Guide

## 🚀 What Changed?

The search bar now has **intelligent autocomplete** with:
- Real-time profile & hashtag suggestions
- Recent search history (stored locally)
- Keyboard navigation
- Text highlighting

## 📂 Files Modified/Created

### Modified
- `apps/web/src/components/SearchBar.tsx` - Main component enhanced

### Created
- `apps/web/src/hooks/useSearchSuggestions.ts` - Suggestions hook
- `apps/web/src/hooks/useRecentSearches.ts` - Recent searches hook
- `apps/web/src/hooks/index.ts` - Hook exports
- `apps/web/tests/e2e/search-suggestions.spec.ts` - E2E tests
- `apps/web/src/components/SearchBar.README.md` - Component docs
- `docs/SEARCH_BAR_DEMO.md` - Visual demo
- `SEARCH_ENHANCEMENT_SUMMARY.md` - Implementation summary
- `SEARCH_QUICK_START.md` - This file

## ⚡ Quick Test

### 1. Run the App
```bash
cd Linkora-social
npm run dev
# or
pnpm dev
```

### 2. Test Recent Searches
1. Go to the homepage
2. Type "test query" in search bar
3. Press Enter or click Search
4. Go back to homepage
5. Click search bar (don't type)
6. ✅ Should see "test query" in recent searches

### 3. Test Suggestions
1. Click search bar
2. Type "ali" (at least 2 chars)
3. Wait ~400ms
4. ✅ Should see profile suggestions

### 4. Test Keyboard Navigation
1. Type in search bar
2. Press ↓ arrow key
3. ✅ First suggestion should highlight
4. Press Enter
5. ✅ Should execute search

## 🧪 Run Tests

```bash
# E2E tests
cd Linkora-social
npx playwright test search-suggestions
```

## 🔧 Configuration

### Customize Debounce Delay
```tsx
// In useSearchSuggestions hook
const { suggestions } = useSearchSuggestions({
  debounceMs: 500,        // Change from 300 to 500ms
  minQueryLength: 3,      // Require 3 chars instead of 2
  maxSuggestions: 10      // Show 10 instead of 5
});
```

### Customize Max Recent Searches
```tsx
// In useRecentSearches hook
const { recentSearches } = useRecentSearches(15); // Store 15 instead of 10
```

### Change localStorage Key
```tsx
// In useRecentSearches.ts
const RECENT_SEARCHES_KEY = "my_custom_key";
```

## 🎨 Styling

### Custom Colors
```css
/* In your global CSS */
:root {
  --suggestion-highlight: #a855f7; /* Purple for highlights */
  --suggestion-hover: #f3f4f6;     /* Gray for hover */
}
```

### Custom Icons
Replace the avatar gradient in `SearchBar.tsx`:
```tsx
<div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-green-500">
  {/* Your custom gradient */}
</div>
```

## 🐛 Troubleshooting

### Suggestions Not Appearing?
1. Check browser console for errors
2. Verify API endpoint is accessible:
   ```bash
   curl http://localhost:3001/api/profiles/search?q=test
   ```
3. Check `NEXT_PUBLIC_INDEXER_API_URL` env variable

### Recent Searches Not Persisting?
1. Check browser localStorage:
   ```js
   localStorage.getItem('linkora_recent_searches')
   ```
2. Try clearing and testing again:
   ```js
   localStorage.removeItem('linkora_recent_searches')
   ```
3. Check for localStorage quota errors in console

### Debounce Too Slow/Fast?
Adjust in `useSearchSuggestions.ts`:
```tsx
const DEBOUNCE_MS = 200; // Faster
// or
const DEBOUNCE_MS = 500; // Slower
```

### TypeScript Errors?
Run type check:
```bash
cd apps/web
npm run type-check
```

## 📱 Mobile Testing

### Test on Real Device
```bash
# Get your local IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# Access from mobile
http://<your-ip>:3000
```

### Test Touch Interactions
1. Tap search bar
2. Type on mobile keyboard
3. Tap a suggestion
4. ✅ Should work smoothly

## 🔒 Security Notes

- Recent searches stored **locally** (not sent to server)
- API requests use standard fetch (no auth needed for public search)
- XSS protection: Text properly escaped in highlights
- No sensitive data in localStorage

## 📊 Performance Tips

### Reduce API Calls
```tsx
// Increase debounce
debounceMs: 500  // Wait longer before API call
```

### Reduce Suggestion Count
```tsx
// Fetch fewer suggestions
maxSuggestions: 3  // Only top 3 results
```

### Lazy Load Component
```tsx
import dynamic from 'next/dynamic';

const SearchBar = dynamic(() => import('@/components/SearchBar'), {
  ssr: false  // Client-side only
});
```

## 🎯 Next Steps

### Add More Suggestion Types
Edit `useSearchSuggestions.ts` to fetch posts or other content:
```tsx
const [postsResponse, profilesResponse] = await Promise.all([
  fetch(`${API_URL}/api/posts/search?q=${query}`),
  fetch(`${API_URL}/api/profiles/search?q=${query}`)
]);
```

### Add Search Analytics
Track what users search for:
```tsx
const handleSearch = (query: string) => {
  // Log to analytics
  analytics.track('search', { query });
  
  // Execute search
  onSearch(query);
};
```

### Sync Recent Searches to Backend
Replace localStorage with API calls:
```tsx
// Save to server
await fetch('/api/user/recent-searches', {
  method: 'POST',
  body: JSON.stringify({ query })
});
```

## 📚 Learn More

- **Full docs**: `apps/web/src/components/SearchBar.README.md`
- **Visual demo**: `docs/SEARCH_BAR_DEMO.md`
- **Implementation details**: `SEARCH_ENHANCEMENT_SUMMARY.md`
- **Tests**: `apps/web/tests/e2e/search-suggestions.spec.ts`

## 💡 Tips

1. **Test keyboard first** - Most users will arrow-key through suggestions
2. **Keep suggestions relevant** - Only show profiles matching the query
3. **Clear recent searches periodically** - Add auto-cleanup after 30 days
4. **Monitor API performance** - Add timeouts to prevent slow searches
5. **A/B test debounce delays** - Find the sweet spot for your users

## ✅ Checklist

Before pushing to production:

- [ ] Tested on Chrome, Firefox, Safari
- [ ] Tested on mobile (iOS, Android)
- [ ] Keyboard navigation works
- [ ] Recent searches persist
- [ ] API errors handled gracefully
- [ ] No console errors
- [ ] Accessibility tested (screen reader)
- [ ] Dark mode looks good
- [ ] E2E tests pass
- [ ] Performance is acceptable (<1s suggestions)

## 🆘 Need Help?

Check these resources:
1. Component README: `SearchBar.README.md`
2. Implementation summary: `SEARCH_ENHANCEMENT_SUMMARY.md`
3. Test examples: `search-suggestions.spec.ts`
4. GitHub issues (if applicable)

---

**Last Updated:** 2026-06-27
**Version:** 1.0.0
