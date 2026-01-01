# Best Practices for Building MLB Home Run Hub

This document outlines the best practices, patterns, and lessons learned while building the MLB Home Run Hub application.

## API Reference

**MLB Stats API Documentation:**
- Official API: https://statsapi.mlb.com/api/v1
- Python Wrapper & Guide: https://github.com/toddrob99/MLB-StatsAPI
- Endpoint Explorer: https://github.com/toddrob99/MLB-StatsAPI/wiki

## Project Architecture

### 1. Separation of Concerns

**API Layer (`mlbApi.js`)**
- ✅ All API calls isolated in a dedicated service file
- ✅ Reusable utility functions (e.g., `getCurrentBaseballSeason`, `getLastNSeasons`)
- ✅ Consistent error handling with try-catch blocks
- ✅ Fallback data for graceful degradation
- ✅ Clear function documentation with JSDoc-style comments

```javascript
// Good: Centralized API logic
export async function getSeasonLeaders(season) {
  try {
    const response = await fetch(`${BASE_URL}/...`);
    // ... handle response
  } catch (error) {
    console.error('Error:', error);
    return []; // Graceful fallback
  }
}
```

**UI Layer (`App.jsx`)**
- ✅ Component focused on rendering and user interactions
- ✅ State management with React hooks
- ✅ Computed values with useMemo for performance
- ✅ Side effects isolated in useEffect

### 2. Dynamic Data Over Hardcoded Values

**Before (Hardcoded):**
```javascript
const seasons = [2025, 2024, 2023, 2022];
const notablePlayers = { 'Aaron Judge': 592450, ... };
```

**After (Dynamic):**
```javascript
const seasons = getLastNSeasons(10); // Auto-updates
const topPlayers = await getTopPlayersFromSeasons(10, 100); // Data-driven
```

**Benefits:**
- ✅ No manual updates required when years change
- ✅ Automatically adapts to current date
- ✅ Scalable to any time range
- ✅ Reduces maintenance burden

### 3. Context-Aware Date Handling

**Baseball Season Logic:**
```javascript
export function getCurrentBaseballSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  
  // Jan-Apr (months 0-3) = offseason, use previous year
  return month <= 3 ? year - 1 : year;
}
```

**Key Principle:** Understand domain-specific context (baseball offseason) and encode that logic explicitly.

## API Integration Patterns

### 4. Intelligent API Querying

**Strategy for Multi-Season Data:**
- ✅ Use loops for individual season queries when batch queries aren't supported
- ✅ Aggregate data client-side when necessary
- ✅ Cache results in state to avoid repeated calls

```javascript
// Individual season fetches for accuracy
for (const season of seasons) {
  const data = await getPlayerTrajectory(playerId, [season]);
  // ... accumulate results
}
```

### 5. Robust Error Handling

**Three-Layer Safety Net:**

1. **API Level:** Try-catch with error logging
2. **Fallback Data:** Hardcoded defaults when API fails
3. **UI Level:** Loading states and "Loading..." placeholders

```javascript
// API Layer
try {
  const data = await fetch(url);
  return processData(data);
} catch (error) {
  console.error('API Error:', error);
  return fallbackData; // Layer 2
}

// UI Layer
value={data ? data.value : "Loading..."} // Layer 3
```

### 6. Parameter Optimization

**Use Specific API Parameters:**
- `playerPool=ACTIVE` - Only active players
- `statType=career` vs `statType=statsSingleSeason`
- `leaderGameTypes=R` - Regular season only
- `sportId=1` - MLB specifically

## State Management

### 7. Organized State Structure

```javascript
// Separate concerns
const [loading, setLoading] = useState(true);
const [historicalRecords, setHistoricalRecords] = useState([]);
const [seasonLeaders, setSeasonLeaders] = useState({});
const [playerTrajectories, setPlayerTrajectories] = useState({});
const [activeCareerLeader, setActiveCareerLeader] = useState(null);
```

**Principles:**
- ✅ One state variable per data concern
- ✅ Initialize with appropriate empty values ([], {}, null)
- ✅ Use objects for keyed data (seasonLeaders by year)
- ✅ Use arrays for lists

### 8. Computed Values with useMemo

```javascript
const filteredHistory = useMemo(() => {
  return historicalRecords.filter(r => 
    r.player.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [searchTerm, historicalRecords]);
```

**Benefits:**
- ✅ Prevents unnecessary recalculations
- ✅ Explicit dependencies make logic clear
- ✅ Performance optimization for filtering/sorting

### 9. Centralized Data Fetching

```javascript
useEffect(() => {
  async function fetchData() {
    setLoading(true);
    try {
      // Fetch all data in one place
      const historical = await getHistoricalRecords();
      const leaders = await getMultipleSeasonLeaders();
      const careerLeader = await getActiveCareerLeader();
      // ... etc
      
      // Update all state
      setHistoricalRecords(historical);
      setSeasonLeaders(leaders);
      setActiveCareerLeader(careerLeader);
    } finally {
      setLoading(false);
    }
  }
  fetchData();
}, []); // Empty deps = run once on mount
```

## UI/UX Patterns

### 10. Loading States

```javascript
{loading && (
  <div className="text-center py-20">
    <div className="inline-block animate-spin rounded-full..."></div>
    <p>Loading MLB data...</p>
  </div>
)}
```

**Always provide:**
- ✅ Visual spinner/indicator
- ✅ Descriptive text
- ✅ Prevents showing empty UI

### 11. Data Transformation for Display

**Transform at Render Time:**
```javascript
Object.entries(playerTrajectories)
  .map(([name, data]) => ({
    name,
    data,
    total: data.reduce((sum, d) => sum + d.hr, 0)
  }))
  .sort((a, b) => b.total - a.total) // Sort by total
  .map(({ name, data, total }) => {
    // Render with sorted data
  })
```

**Benefits:**
- ✅ Original data unchanged
- ✅ Easy to adjust sorting/filtering
- ✅ Clear data flow

## Code Quality

### 12. Consistent Naming Conventions

- **Functions:** Verb-first (`getSeasonLeaders`, `fetchData`)
- **Boolean states:** `is*` or `has*` prefix
- **Event handlers:** `handle*` or `on*` prefix
- **Constants:** UPPER_SNAKE_CASE (`BASE_URL`, `NOTABLE_PLAYERS`)

### 13. Comment Intent, Not Implementation

**Good:**
```javascript
// Fetch top 100 players from last 10 seasons dynamically
const topPlayers = await getTopPlayersFromSeasons(10, 100);
```

**Bad:**
```javascript
// Call the getTopPlayersFromSeasons function with 10 and 100
const topPlayers = await getTopPlayersFromSeasons(10, 100);
```

### 14. Utility Functions for Reusability

```javascript
// Reusable across multiple features
export function getLastNSeasons(n = 10) {
  const currentSeason = getCurrentBaseballSeason();
  const seasons = [];
  for (let i = 0; i < n; i++) {
    seasons.push(currentSeason - i);
  }
  return seasons;
}
```

## Performance Considerations

### 15. Batch Operations When Possible

```javascript
// Fetch multiple players in parallel
const trajectories = {};
for (const player of topPlayers) {
  const data = await getPlayerTrajectory(player.id, trajectoryYears);
  if (data.length > 0) {
    trajectories[player.name] = data;
  }
}
```

**Note:** Use `Promise.all()` for parallel fetches when API allows:
```javascript
const results = await Promise.all(
  players.map(p => getPlayerTrajectory(p.id, years))
);
```

### 16. Conditional Rendering

```javascript
{activeTab === 'trends' && !loading && (
  <div>...</div>
)}
```

**Benefits:**
- ✅ Only render active tab content
- ✅ Don't process hidden data
- ✅ Faster initial load

## Data Integrity

### 17. Type Safety with Validation

```javascript
const hr = parseInt(leader.value); // Ensure number
const year = leader.season ? parseInt(leader.season) : null; // Handle missing
```

### 18. Null/Undefined Safety

```javascript
// Optional chaining
const leader = seasonLeaders[currentSeason]?.[0];

// Fallback values
const maxHR = historicalRecords[0]?.hr || 73;

// Conditional rendering
{currentSeasonLeader ? `${currentSeasonLeader.hr}...` : "Loading..."}
```

## Development Workflow

### 19. Incremental Feature Building

1. ✅ Start with hardcoded data to test UI
2. ✅ Replace with API calls one feature at a time
3. ✅ Add error handling and fallbacks
4. ✅ Optimize and refactor

### 20. Console Logging for Debugging

```javascript
console.log(`Fetched ${topPlayers.length} top players from last 10 seasons`);
console.log(`Player ${playerId} trajectory:`, trajectory);
```

**Benefits:**
- ✅ Track API response structure
- ✅ Verify data flow
- ✅ Debug empty results

## Project Maintenance

### 21. README Documentation

Maintain comprehensive README with:
- ✅ Features overview
- ✅ API endpoints used with parameters
- ✅ Installation instructions
- ✅ Recent updates log
- ✅ Future enhancements

### 22. Configuration Management

```javascript
// Centralize configuration
const BASE_URL = 'https://statsapi.mlb.com/api/v1';

// Easy to update for different environments
```

## Key Takeaways

### Do's ✅
- Make data calculations dynamic based on current date
- Isolate API logic from UI components
- Handle errors gracefully with fallbacks
- Use loading states for better UX
- Document domain-specific logic (e.g., offseason handling)
- Keep functions small and focused
- Use semantic naming conventions
- Test with console logs during development

### Don'ts ❌
- Don't hardcode dates or years that will become outdated
- Don't mix API calls with rendering logic
- Don't skip error handling
- Don't show empty UI without loading indicators
- Don't assume API structure - validate and handle missing data
- Don't over-fetch data (use limits and filters)
- Don't duplicate logic - create reusable utilities

## Testing Checklist

Before deployment:
- [ ] Test offseason date logic (Jan-Apr edge cases)
- [ ] Verify API fallbacks work when offline
- [ ] Check loading states appear correctly
- [ ] Validate data displays for all tabs
- [ ] Test dropdown with all available seasons
- [ ] Verify sorting/filtering functionality
- [ ] Check responsive design on mobile
- [ ] Review console for errors/warnings
- [ ] Test with slow network connection
- [ ] Verify all dynamic values update correctly

## Future Best Practices

As the app grows, consider:
- **React Context** for global state (theme, user preferences)
- **Custom Hooks** for reusable logic (useFetchMLBData)
- **TypeScript** for type safety
- **React Query** for advanced API caching/refetching
- **Unit Tests** for utility functions
- **E2E Tests** for critical user flows
- **Environment Variables** for API configuration
- **Error Boundaries** for component-level error handling

---

**Built with React + Vite + MLB Stats API**  
*Last Updated: January 2026*
