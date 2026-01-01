# Common Tasks & Workflows

This file contains common prompts and workflows for working with the MLB Home Run Hub project.

## Quick Start Commands

### Development
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install dependencies
npm install
```

### Git Workflow
```bash
# Check status
git status

# Stage changes
git add .

# Commit with message
git commit -m "feat: add new feature"

# Push to GitHub
git push origin main
```

## Common Development Tasks

### 1. Add a New Statistic

**Prompt:**
```
Add a new statistic to the Active Trends cards showing [statistic name].
It should appear below [existing stat] and be calculated from [data source].
```

**Files to modify:**
- `src/App.jsx` - Add new stat row in card footer
- `src/mlbApi.js` - Add calculation if needed

### 2. Change Time Range

**Prompt:**
```
Change the Active Trends to show [N] years instead of 10 years.
Also update the Yearly Leaders dropdown to show [M] years.
```

**Files to modify:**
- `src/App.jsx` - Update `getLastNSeasons(N)` calls
- `README.md` - Update documentation

### 3. Add New Tab

**Prompt:**
```
Add a new tab called "[Tab Name]" that displays [description of data].
It should fetch data from [API endpoint] and show [visualization type].
```

**Steps:**
1. Add button to header tab navigation
2. Add state for tab data
3. Add fetch call in useEffect
4. Add conditional rendering section
5. Create layout and components

### 4. Modify API Query

**Prompt:**
```
Update the [function name] API call to include [new parameter]
to filter results by [criteria].
```

**Files to modify:**
- `src/mlbApi.js` - Update fetch URL with new parameters

### 5. Fix Loading State

**Prompt:**
```
The [component/section] is not showing a loading indicator.
Add proper loading state handling.
```

**Pattern to implement:**
```javascript
{loading && <LoadingSpinner />}
{!loading && <ActualContent />}
```

## Data-Related Workflows

### Update Fallback Data

**When to do:** API structure changes or data becomes stale

**Prompt:**
```
Update the fallback data in [function name] to reflect current records.
The new top 3 are: [player 1], [player 2], [player 3].
```

### Add New Player to Tracking

**Prompt:**
```
Add [Player Name] to the Active Trends visualization.
Make sure their data is fetched dynamically.
```

**Note:** No action needed - top 100 system automatically includes top performers.

### Change Season Range

**Prompt:**
```
Update all season-based queries to use [new range] instead of last 10 years.
Ensure consistency across all tabs.
```

**Files to check:**
- `src/App.jsx` - All `getLastNSeasons()` calls
- `src/mlbApi.js` - `getTopPlayersFromSeasons()` parameters

## UI/UX Workflows

### Add Search Functionality

**Prompt:**
```
Add a search bar to the [tab name] tab that filters [data type] by [criteria].
```

**Pattern:**
```javascript
const [searchTerm, setSearchTerm] = useState('');

const filtered = useMemo(() => {
  return data.filter(item => 
    item.field.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [searchTerm, data]);
```

### Modify Sorting

**Prompt:**
```
Change the Active Trends sorting to order by [metric] instead of total home runs.
```

**File:** `src/App.jsx` - Update `.sort()` function in trends rendering

### Update Color Scheme

**Prompt:**
```
Change the color of [element] from [current color] to [new color].
Use Tailwind classes.
```

**Pattern:**
```
Find: bg-blue-500
Replace: bg-[newcolor]-500
```

### Make Component Responsive

**Prompt:**
```
Make the [component] responsive for mobile devices.
On small screens it should [behavior].
```

**Pattern:** Add Tailwind responsive prefixes: `md:`, `lg:`, `xl:`

## Performance Workflows

### Optimize API Calls

**Prompt:**
```
The app is making too many API calls. Combine the calls for [functions]
into a single batch operation where possible.
```

**Pattern:** Use `Promise.all()` for parallel fetches

### Add Caching

**Prompt:**
```
Cache the results of [API call] for [duration] to reduce redundant requests.
```

**Consider:** React Query or simple in-memory cache

### Reduce Bundle Size

**Prompt:**
```
Analyze the bundle and identify opportunities to reduce size.
Consider code splitting for [large component].
```

**Commands:**
```bash
npm run build
# Check dist/ folder sizes
```

## Debugging Workflows

### API Not Returning Data

**Checklist:**
1. Check console for errors
2. Verify URL in Network tab
3. Test URL directly in browser
4. Check for missing parameters
5. Verify date calculations (offseason?)

**Prompt:**
```
The [API function] is not returning data. Add console.log statements
to debug the response structure and identify where it fails.
```

### Component Not Updating

**Checklist:**
1. Verify state is being updated
2. Check useEffect dependencies
3. Ensure conditional rendering logic is correct
4. Look for missing key props

**Prompt:**
```
The [component] is not re-rendering when [data] changes.
Debug the state flow and dependency array.
```

### Styling Not Applying

**Checklist:**
1. Verify Tailwind class names are correct
2. Check for conflicting classes
3. Inspect element in DevTools
4. Ensure class is not being overridden

**Prompt:**
```
The Tailwind class [classname] is not applying to [element].
Check the configuration and class precedence.
```

## Testing Workflows

### Test Edge Cases

**Prompt:**
```
Test the app with these edge cases:
1. Current date is January 1 (offseason)
2. API returns empty array
3. Player has only 1 season of data
4. User searches for non-existent player
```

### Test Different Seasons

**Prompt:**
```
Change the mock date to [specific date] and verify the season calculation
returns [expected year].
```

**Manual test:**
```javascript
// In browser console:
const testDate = new Date('2026-02-15');
// Verify getCurrentBaseballSeason() logic
```

### Verify API Parameters

**Prompt:**
```
For each API call, verify the parameters match the expected format:
- Check season values are correct years
- Verify limit parameters
- Confirm sportId=1 is present
```

## Documentation Workflows

### Update README

**When to do:** After adding features or changing behavior

**Prompt:**
```
Update README.md to document the new [feature name] feature.
Include it in the Features section and Recent Updates.
```

### Update Best Practices

**When to do:** After establishing new patterns

**Prompt:**
```
Add a new best practice to .claude/best-practices.md about [topic].
Include code examples and explain the benefit.
```

### Add Code Comments

**Prompt:**
```
Add explanatory comments to [function/section] explaining [complex logic].
Focus on WHY not WHAT.
```

## Maintenance Workflows

### Update Dependencies

```bash
# Check for outdated packages
npm outdated

# Update specific package
npm update [package-name]

# Update all packages (careful!)
npm update
```

**Prompt:**
```
Update [package] to version [version] and test for breaking changes.
```

### Review and Clean Code

**Prompt:**
```
Review the codebase for:
1. Unused imports
2. Console.log statements
3. Commented-out code
4. TODO comments that should be addressed
```

### Optimize Images/Assets

**Prompt:**
```
Check if there are any images or assets that can be optimized
or lazy-loaded to improve performance.
```

## Deployment Workflows

### Prepare for Production

**Checklist:**
- [ ] Remove all debug console.logs
- [ ] Verify all environment variables
- [ ] Test build locally (`npm run build && npm run preview`)
- [ ] Check for warnings in build output
- [ ] Verify all features work in production build

**Prompt:**
```
Prepare the app for production deployment. Remove debug code,
verify all features work, and ensure the build is optimized.
```

### Deploy to GitHub Pages

**Prompt:**
```
Set up GitHub Pages deployment for this project.
Add necessary configuration to vite.config.js and create deploy script.
```

### Deploy to Vercel/Netlify

**Prompt:**
```
Configure the project for [Vercel/Netlify] deployment.
Add necessary configuration files and environment variables.
```

## Emergency Fixes

### Quick Revert

```bash
# Undo last commit (keep changes)
git reset HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Revert specific file
git checkout HEAD -- <file>
```

### API is Down

**Prompt:**
```
The MLB API is down. Ensure all fallback data is working correctly
and add user notification about using cached data.
```

### Critical Bug in Production

**Prompt:**
```
There's a critical bug: [description].
Create a hotfix that:
1. Fixes the immediate issue
2. Doesn't break other features
3. Can be deployed quickly
```

## Feature Request Templates

### Simple Feature
```
Add [feature] to [component/tab].
It should [behavior] when [trigger].
Use the same styling as [existing element].
```

### Complex Feature
```
Implement [feature name]:

Requirements:
- [requirement 1]
- [requirement 2]
- [requirement 3]

Data source: [API or calculation]
UI location: [where it appears]
User interaction: [how users interact]
Edge cases: [what to handle]
```

### Refactoring Request
```
Refactor [file/component]:
- Extract [logic] into separate function
- Simplify [complex section]
- Improve [aspect]
- Maintain backward compatibility
```

## Code Review Prompts

**Before committing:**
```
Review the changes I'm about to commit:
1. Are there any hardcoded values that should be dynamic?
2. Is error handling comprehensive?
3. Are there opportunities to reuse existing functions?
4. Does this follow the established patterns?
5. Is the code documented appropriately?
```

## Quick Fixes

### Fix Tailwind Not Working
```
Tailwind CSS is not applying. Check:
1. vite.config.js has @tailwindcss/vite plugin
2. index.css has @import "tailwindcss"
3. tailwind.config.js content paths are correct
4. Dev server is running
```

### Fix API CORS Issues
```
If API calls fail with CORS errors:
1. Verify the API allows cross-origin requests
2. Check browser console for specific error
3. Consider using a proxy in vite.config.js if needed
```

### Fix Build Errors
```
Build is failing. Check:
1. All imports are correct
2. No missing dependencies
3. No TypeScript errors (if using TS)
4. Run `npm install` to ensure deps are installed
5. Clear node_modules and reinstall if necessary
```
