# Coding Rules for MLB Home Run Hub

## Core Principles

1. **No Hardcoded Dates or Years**
   - ALWAYS use `getCurrentBaseballSeason()` and `getLastNSeasons(n)`
   - Never hardcode year values like `2025`, `2024`, etc.
   - Account for baseball offseason (Jan-Apr = previous year)

2. **Separation of Concerns**
   - API logic goes in `src/mlbApi.js`
   - UI components stay in `src/App.jsx`
   - Never mix fetch calls with JSX rendering

3. **Error Handling Required**
   - Every API call MUST have try-catch
   - Every API function MUST have fallback data
   - Every UI component MUST have loading states

4. **Dynamic Over Static**
   - Data-driven player lists (use `getTopPlayersFromSeasons()`)
   - API-calculated values over hardcoded constants
   - Computed values with `useMemo` for derived data

## File-Specific Rules

### src/mlbApi.js

```javascript
// ✅ ALWAYS follow this pattern:
export async function getFunctionName() {
  try {
    const response = await fetch(`${BASE_URL}/...`);
    const data = await response.json();
    
    if (!data.expectedProperty) {
      console.error('Error message');
      return fallbackValue;
    }
    
    return processedData;
  } catch (error) {
    console.error('Error:', error);
    return fallbackValue;
  }
}
```

**Required:**
- JSDoc comments for all exported functions
- Error logging with `console.error()`
- Fallback values for graceful degradation
- Input validation for parameters

**Forbidden:**
- Hardcoded years in API calls
- Missing error handling
- Exposing raw API responses without processing

### src/App.jsx

```javascript
// ✅ REQUIRED state management pattern:
const [loading, setLoading] = useState(true);
const [data, setData] = useState(appropriateEmptyValue);

useEffect(() => {
  async function fetchData() {
    setLoading(true);
    try {
      const result = await apiFunction();
      setData(result);
    } finally {
      setLoading(false);
    }
  }
  fetchData();
}, []);

// ✅ REQUIRED loading UI:
{loading && <LoadingSpinner />}
{!loading && <ActualContent />}
```

**Required:**
- Loading states for ALL async operations
- Empty dependency array `[]` for mount-only effects
- `finally` block to ensure loading=false
- Conditional rendering based on loading state

**Forbidden:**
- Direct API calls in component body
- Missing loading indicators
- Hardcoded data values

## API Integration Rules

### MLB Stats API Patterns

1. **Base URL**: Always use `BASE_URL` constant
2. **Required Parameters**:
   - `sportId=1` (MLB only)
   - `leaderGameTypes=R` (regular season)
   - `season={year}` for season-specific queries
   - `limit={n}` to control result size

3. **Player Pool Filters**:
   - Use `playerPool=ACTIVE` for active players only
   - Use `statType=career` for career stats
   - Use `statType=statsSingleSeason` for historical records

4. **Data Validation**:
   ```javascript
   // ✅ ALWAYS validate before accessing
   if (!data.leagueLeaders?.[0]?.leaders) {
     return fallbackData;
   }
   ```

## React Patterns

### State Management

- **Primitive data**: `useState(initialValue)`
- **Arrays**: `useState([])`
- **Objects**: `useState({})`
- **Null-safe**: `useState(null)` when data may not exist

### Computed Values

```javascript
// ✅ USE useMemo for filtering/sorting
const filteredData = useMemo(() => {
  return data.filter(condition);
}, [data, dependencies]);

// ❌ DON'T compute in render
const filteredData = data.filter(condition); // Re-runs every render
```

### Conditional Rendering

```javascript
// ✅ CORRECT
{activeTab === 'trends' && !loading && <Content />}

// ❌ WRONG - missing loading check
{activeTab === 'trends' && <Content />}
```

## Styling Rules (Tailwind CSS v4)

1. **Import**: Use `@import "tailwindcss";` in `index.css`
2. **Plugin**: Use `@tailwindcss/vite` plugin in `vite.config.js`
3. **Classes**: Prefer utility classes over custom CSS
4. **Responsive**: Use `md:`, `lg:` prefixes for breakpoints
5. **Dark Mode**: Include `dark:` variants for all colors

## Data Flow Rules

### Data Transformation

```javascript
// ✅ CORRECT: Transform at render time
Object.entries(data)
  .map(([key, value]) => ({ ...value, total: calculate(value) }))
  .sort((a, b) => b.total - a.total)
  .map(item => <Component key={item.name} {...item} />)

// ❌ WRONG: Mutating original data
data.forEach(item => item.total = calculate(item));
```

### Null Safety

```javascript
// ✅ ALWAYS use optional chaining and fallbacks
const value = data?.property?.nested || defaultValue;

// ✅ ALWAYS validate before array operations
const leaders = seasonLeaders[year] || [];
leaders.map(...)

// ❌ NEVER assume data exists
const value = data.property.nested; // Can crash
```

## Performance Rules

1. **Parallel Fetching**: Use `Promise.all()` when possible
2. **Conditional Rendering**: Only render active tab content
3. **Memoization**: Use `useMemo` for expensive calculations
4. **List Keys**: Always use stable, unique keys (not index)

## Documentation Rules

### Comments

- **DO**: Explain business logic (e.g., "Jan-Apr is offseason")
- **DO**: Document API limitations or quirks
- **DON'T**: State the obvious (e.g., "call the function")
- **DON'T**: Leave commented-out code

### Console Logging

```javascript
// ✅ KEEP for debugging API responses
console.log(`Fetched ${players.length} players`);
console.log('Player trajectory:', data);

// ✅ ALWAYS log errors
console.error('Error fetching data:', error);

// ❌ REMOVE before production
console.log('test');
console.log('here');
```

## Git Rules

### Commit Messages

Format: `<type>: <description>`

Types:
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code restructuring
- `docs:` Documentation only
- `style:` Formatting, no logic change
- `perf:` Performance improvement

Examples:
- `feat: add dynamic player selection from API`
- `fix: handle offseason date calculation correctly`
- `refactor: extract API calls to mlbApi.js`

## Testing Checklist

Before committing:
- [ ] No hardcoded years in code
- [ ] All API calls have error handling
- [ ] Loading states display correctly
- [ ] Console has no errors
- [ ] Dark mode works
- [ ] Responsive on mobile
- [ ] No duplicate keys in lists

## Domain-Specific Rules

### Baseball Season Logic

```javascript
// ✅ CORRECT: Account for offseason
const month = now.getMonth(); // 0-indexed
return month <= 3 ? year - 1 : year; // Jan-Apr = previous year

// ❌ WRONG: Assumes calendar year = baseball year
return now.getFullYear();
```

### Home Run Records

- Single-season record: 73 (Barry Bonds, 2001)
- AL record: 62 (Aaron Judge, 2022)
- Use as fallback values when API fails

### MLB Abbreviations

- Teams: 3-letter codes (NYY, LAD, SFG)
- Leagues: AL (American League), NL (National League)
- Stats: HR (home runs), not "homeruns" or "homers"

## Code Review Checklist

- [ ] No magic numbers (use named constants)
- [ ] No duplicate code (create utility functions)
- [ ] Consistent naming (camelCase for functions/variables)
- [ ] Proper TypeScript types (if using TypeScript)
- [ ] Accessibility attributes (aria-labels where needed)
- [ ] Error boundaries for component crashes

## What NOT to Do

❌ **NEVER**:
- Hardcode years, dates, or player IDs in UI components
- Skip error handling on API calls
- Render without checking loading state
- Use array indices as React keys
- Commit console.log debugging statements
- Mix API and UI logic in same function
- Assume API data structure without validation
- Ignore offseason logic in date calculations
- Use inline styles instead of Tailwind classes
- Forget fallback values for optional data

## When in Doubt

1. Check existing patterns in the codebase
2. Refer to `.claude/best-practices.md`
3. Test with edge cases (offseason dates, empty data, API failures)
4. Ask: "Will this break when the year changes?"
5. Ask: "What happens if the API is down?"
