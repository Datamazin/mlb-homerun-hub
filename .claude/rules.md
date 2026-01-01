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

4. **Team Abbreviations**:
   - **CRITICAL**: The leaders API (`/stats/leaders`) does NOT return team abbreviations
   - API response only includes: `team.id`, `team.name`, `team.link`
   - **SOLUTION**: Use `TEAM_ABBREVIATIONS` mapping by team ID
   ```javascript
   // ✅ CORRECT: Use team ID mapping
   const TEAM_ABBREVIATIONS = {
     108: 'LAA', 109: 'ARI', 110: 'BAL', 111: 'BOS', 112: 'CHC',
     113: 'CIN', 114: 'CLE', 115: 'COL', 116: 'DET', 117: 'HOU',
     118: 'KC',  119: 'LAD', 120: 'WSH', 121: 'NYM', 133: 'OAK',
     134: 'PIT', 135: 'SD',  136: 'SEA', 137: 'SF',  138: 'STL',
     139: 'TB',  140: 'TEX', 141: 'TOR', 142: 'MIN', 143: 'PHI',
     144: 'ATL', 145: 'CWS', 146: 'MIA', 147: 'NYY', 158: 'MIL'
   };
   
   const team = TEAM_ABBREVIATIONS[leader.team?.id] || 
                leader.team?.name?.substring(0, 3).toUpperCase();
   
   // ❌ WRONG: These fields don't exist in leaders API
   const team = leader.team?.abbreviation; // undefined
   const team = leader.team?.teamCode;     // undefined
   const team = leader.team?.fileCode;     // undefined
   
   // ❌ WRONG: Creates collisions (NYY and NYM both become "NEW")
   const team = leader.team?.name?.substring(0, 3); // "New York..." → "NEW"
   ```
   
   - **Reference**: Team details API `/api/v1/teams/{id}` has full team info
   - Source: https://statsapi.mlb.com/api/v1/teams/147 (includes abbreviation, fileCode, teamCode)
   - The mapping is stable (30 MLB teams, IDs don't change)

5. **Team Logos**:
   - **Best Practice**: Use MLB's official CDN for team logo SVGs
   - **Primary Source**: `https://www.mlbstatic.com/team-logos/{teamId}.svg`
   - **Alternative**: Cap logos may be available via different endpoints
   - **Performance**: SVGs are lightweight and scale perfectly
   
   ```javascript
   // ✅ RECOMMENDED: Direct SVG by team ID from MLB CDN
   const logoUrl = `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
   // Example: https://www.mlbstatic.com/team-logos/147.svg (Yankees)
   
   // ✅ Usage in React
   <img 
     src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
     alt={`${teamAbbr} logo`}
     className="w-8 h-8 object-contain"
     onError={(e) => e.target.style.display = 'none'}
   />
   
   // ❌ AVOID: Wrong domain (doesn't work)
   const logoUrl = `https://www.mlb.com/images/team-logos/${teamId}.svg`;
   
   // ❌ AVOID: Don't hardcode logo URLs for specific teams
   // ❌ AVOID: Don't store logos locally (violates MLB copyright)
   ```
   
   - **Note**: All MLB logos are copyrighted by MLB and respective teams
   - Reference: https://github.com/toddrob99/MLB-StatsAPI/wiki
   - Use logos per MLB's usage guidelines: http://gdx.mlb.com/components/copyright.txt

6. **Player Headshots**:
   - **Best Practice**: Use MLB's official image CDN for player photos
   - **Primary Source**: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/{personId}/headshot/67/current`
   - **Generic Fallback**: The `d_people:generic:headshot:67:current.png` provides default image if player photo unavailable
   - **Responsive Sizing**: Use `w_213` or other widths (adjust for your needs)
   
   ```javascript
   // ✅ RECOMMENDED: Player headshot with generic fallback
   const headshotUrl = `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${personId}/headshot/67/current`;
   // Example: https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/592450/headshot/67/current (Aaron Judge)
   
   // ✅ Usage in React with error handling
   <img
     src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${personId}/headshot/67/current`}
     alt={playerName}
     className="w-20 h-20 rounded-full object-cover"
     onError={(e) => e.target.style.display = 'none'}
   />
   
   // Different sizes available:
   // w_60, w_120, w_213, w_426 (adjust w_ parameter)
   
   // ❌ AVOID: Don't store player photos locally
   // ❌ AVOID: Don't use outdated photo URLs
   ```
   
   - **Note**: Player photos are copyrighted by MLB
   - Person ID comes from `leader.person.id` in API responses
   - Cloudinary CDN provides automatic optimization via `q_auto:best`

5. **Data Validation**:
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
