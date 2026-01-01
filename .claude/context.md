# Project Context: MLB Home Run Hub

## Project Overview

**Name**: MLB Home Run Hub  
**Purpose**: Interactive web application for tracking and visualizing MLB home run statistics, historical records, and player performance trends  
**Tech Stack**: React 18 + Vite + Tailwind CSS v4 + MLB Stats API  
**Repository**: https://github.com/Datamazin/mlb-homerun-hub

## Domain Knowledge

### Baseball Basics

**Season Structure:**
- Regular season: April - September
- Postseason: October
- Offseason: November - March
- Spring Training: February - March

**Key Insight for Development:**
- January through April = offseason
- During these months, "current season" refers to the PREVIOUS year
- Example: In January 2026, the current baseball season is 2025

**Home Runs:**
- Primary offensive statistic tracked
- Single-season records are prestigious achievements
- Career totals measure longevity and consistency

### Historical Context

**All-Time Single Season Records:**
1. Barry Bonds - 73 HR (2001) - MLB Record
2. Mark McGwire - 70 HR (1998)
3. Sammy Sosa - 66 HR (1998)
4. Aaron Judge - 62 HR (2022) - AL Record
5. Roger Maris - 61 HR (1961) - Former AL Record
6. Babe Ruth - 60 HR (1927) - Historic milestone

**Notable Eras:**
- "Dead Ball Era" (1900-1919): Low scoring
- "Live Ball Era" (1920-present): Post-Ruth power surge
- "Steroid Era" (1990s-2000s): Record-breaking seasons
- "Modern Era" (2020-present): Current generation

**Active Career Leaders (as of 2025):**
- Giancarlo Stanton: ~453 HR
- Mike Trout: ~400 HR
- Aaron Judge: Rising star
- Shohei Ohtani: Two-way player phenomenon

## Project Requirements

### Core Features

1. **Historical Records Tab**
   - Display all-time single-season home run leaders
   - Searchable by player name
   - Show rank, player, team, year, HR count, status
   - API-driven data with intelligent fallbacks

2. **Yearly Leaders Tab**
   - Season selector dropdown (last 10 years)
   - Top 4 players per selected year
   - League designation (AL/NL)
   - Dynamic based on current date

3. **Active Trends Tab**
   - Visual bar charts for top 100 players
   - 10-year trajectory data
   - Career high, average, and total statistics
   - Sorted by total home runs (descending)

### Quick Stats Banner

Three stat cards showing:
- Single Season Record (all-time)
- Current Season Leader (for current/most recent year)
- Active Leader (career totals, active players only)

## Technical Specifications

### Data Sources

**MLB Stats API:**
- Base URL: `https://statsapi.mlb.com/api/v1`
- Documentation: https://github.com/toddrob99/MLB-StatsAPI
- No authentication required
- RESTful endpoints

**Key Endpoints:**
1. Season Leaders: `/stats/leaders?leaderCategories=homeRuns&season={year}&statGroup=hitting`
2. Historical Records: `/stats/leaders?statType=statsSingleSeason&leaderCategories=homeRuns`
3. Player Stats: `/people/{playerId}?hydrate=stats(...)`
4. Career Leaders: `/stats/leaders?statType=career&playerPool=ACTIVE`

### State Management

**App-level State:**
- `loading` - Boolean for async operations
- `historicalRecords` - Array of all-time leaders
- `seasonLeaders` - Object keyed by year
- `playerTrajectories` - Object keyed by player name
- `activeCareerLeader` - Object with player/HR count
- `selectedSeason` - Number for dropdown filter
- `searchTerm` - String for player search
- `activeTab` - String ('historical' | 'seasons' | 'trends')

**Constants:**
- `currentSeason` - Calculated from current date
- `availableSeasons` - Array of last 10 seasons

### Business Logic

**Date Calculations:**
```javascript
getCurrentBaseballSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan, 3 = Apr
  return month <= 3 ? year - 1 : year;
}
```

**Dynamic Player Selection:**
- Aggregates leaders from last 10 seasons
- Ranks by total home runs across all seasons
- Fetches player IDs dynamically from API
- Returns top 100 for trajectory visualization

## User Stories

1. **As a baseball fan**, I want to see who hit the most home runs in a single season, so I can understand baseball history
2. **As a statistics enthusiast**, I want to compare players across different years, so I can identify trends
3. **As a casual user**, I want the app to automatically show current data, so I don't have to manually update filters
4. **As a mobile user**, I want the charts to be readable on small screens, so I can browse on my phone
5. **As a power user**, I want to search for specific players, so I can quickly find their records

## Design Decisions

### Why Dynamic Data?

**Problem**: Hardcoded years become outdated  
**Solution**: Calculate everything from current date  
**Benefit**: Zero maintenance for date-related logic

### Why Top 100 Players?

**Problem**: Hardcoded 6 players limited insight  
**Solution**: Dynamically select top 100 from last 10 seasons  
**Benefit**: Comprehensive view of power hitters, auto-updates

### Why Separate Tabs?

**Problem**: Too much data on one screen  
**Solution**: Three focused views (Historical, Yearly, Trends)  
**Benefit**: Better UX, faster loading, clearer navigation

### Why Individual Season API Calls?

**Problem**: Batch queries don't return complete data  
**Solution**: Loop through seasons, fetch individually  
**Benefit**: Accurate year-by-year trajectories

## Known Limitations

1. **API Rate Limits**: Unknown, but not documented in MLB Stats API
2. **Data Accuracy**: Relies on MLB's official statistics
3. **Historical Data**: Some older records may have limited metadata
4. **Player Pool**: Limited to players who appeared in top 10 in any of last 10 seasons
5. **Career Stats**: Only shows active players for career leader

## Future Enhancements

### Planned Features
- Player comparison mode (side-by-side charts)
- Team-by-team leaderboards
- Export data to CSV
- Advanced filtering (by team, league, year range)
- Real-time game updates during active season
- Career trajectory projections
- Hall of Fame probability calculator

### Technical Improvements
- React Query for advanced caching
- TypeScript for type safety
- Unit tests for utility functions
- E2E tests for critical paths
- Web Workers for heavy data processing
- Service Worker for offline support

## Development Environment

**Required:**
- Node.js 18+
- npm 9+
- Modern browser (Chrome, Firefox, Safari, Edge)

**Recommended:**
- VS Code with extensions:
  - ESLint
  - Tailwind CSS IntelliSense
  - Prettier
  - Auto Import

**Dev Server:**
- Runs on `localhost:5173` (or next available port)
- Hot module replacement enabled
- Fast refresh for React components

## Glossary

**Terms:**
- **HR**: Home Runs
- **AL**: American League
- **NL**: National League
- **MLB**: Major League Baseball
- **Trajectory**: Player's year-over-year performance
- **Active Player**: Currently on MLB roster
- **Single Season**: One baseball year (April-September)
- **Career Total**: Cumulative home runs across all seasons
- **Offseason**: November through March when no games are played

**API Terms:**
- **leaderCategories**: Stat type to rank by (homeRuns, RBIs, etc.)
- **statGroup**: hitting, pitching, or fielding
- **statType**: season, career, statsSingleSeason, etc.
- **playerPool**: ACTIVE, ALL, QUALIFIED, etc.
- **sportId**: 1 for MLB, 2 for AAA, etc.

## Common Patterns

### Date Handling
Always use `getCurrentBaseballSeason()` and `getLastNSeasons(n)` instead of hardcoded years.

### API Calls
Always wrap in try-catch with fallback data and error logging.

### State Updates
Always use loading states and finally blocks to ensure UI consistency.

### Data Rendering
Always check for null/undefined before accessing nested properties.

## Project Evolution

**Phase 1**: Single-file React app with hardcoded data  
**Phase 2**: Vite setup with Tailwind CSS  
**Phase 3**: MLB API integration for all data  
**Phase 4**: Dynamic season calculation  
**Phase 5**: Dynamic player selection (top 100)  
**Phase 6**: Extended trajectory period (10 years)  
**Current**: Fully dynamic, production-ready app

## Success Metrics

**Performance:**
- Initial load < 3 seconds
- Tab switching < 100ms
- API calls complete < 2 seconds each

**User Experience:**
- Mobile-responsive (320px+)
- Dark mode support
- Accessible (WCAG AA)
- No layout shift during loading

**Code Quality:**
- No hardcoded dates/years
- 100% error handling coverage
- Comprehensive fallback data
- Clear separation of concerns
