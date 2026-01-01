# MLB Home Run Hub

A modern, interactive web application for tracking and visualizing MLB home run statistics, historical records, and player performance trends.

## Features

### 🏆 Historical Records
- View all-time single-season home run leaders **fetched live from MLB API**
- Search and filter through baseball's greatest power hitters
- Displays records from Babe Ruth to modern-day sluggers
- Real-time data updates with intelligent status labeling
- API-driven rankings with automatic record categorization

### 📊 Season Leaders
- **Dynamically shows last 4 seasons** based on current date
- Automatically adjusts for baseball offseason (Jan-Apr uses previous year)
- View top 4 performers for each year
- Filter by AL/NL league designation
- Real-time data from the MLB Stats API

### 📈 Player Trajectories (Active Trends)
- **Dynamically shows top 100 players from the last 10 seasons** based on total home runs
- Automatically determines notable players from actual performance data
- Visualize career home run trends over **last 10 years (dynamically calculated)**
- Interactive bar charts with **visible data labels** showing year-by-year performance
- Hover tooltips for detailed stats
- Season-by-season API calls for accurate historical data
- Players automatically ranked by their cumulative home run production across the decade

### 🔄 Live MLB API Integration
The app fetches 100% real-time data from the official MLB Stats API:
- **Historical Records**: All-time single season leaders via `statType=statsSingleSeason`
- **Season Leaders**: Live home run statistics **dynamically calculated from current date**
- **Player Stats**: Career trajectories with individual season-by-season API calls
- **Dynamic Player Selection**: Top 100 players automatically determined from last 10 seasons
- **Smart Season Detection**: Automatically detects offseason (Jan-Apr) and adjusts year
- **Dynamic Date Handling**: No hardcoded years - all calculations based on run date
- **Smart Fallbacks**: Graceful degradation with hardcoded data if API fails
- **Intelligent Caching**: Efficient data loading with loading states

## Recent Updates

- ✅ **Top 100 players dynamically determined** - Active Trends now automatically shows the top 100 home run hitters from the last 10 seasons
- ✅ **Extended trajectory period** - Active Trends now displays 10 years of data (up from 5 years)
- ✅ **Intelligent player ranking** - Players sorted by total home runs across the decade, not hardcoded
- ✅ **Dynamic season calculation** - Automatically adjusts based on current date and offseason
- ✅ **No hardcoded years** - Last 4 seasons for leaders, last 10 for trajectories (auto-calculated)
- ✅ **Offseason awareness** - Jan-Apr uses previous year as current season
- ✅ **Historical records now 100% API-driven** - Fetches all-time leaders from MLB API
- ✅ **Data labels added to charts** - Visible home run counts on all trajectory bars
- ✅ **Improved API reliability** - Individual season fetches for accurate historical data
- ✅ **Smart status labeling** - Automatic categorization of historical record significance

## Technologies Used

- **React 18** - Modern UI framework with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS v4** - Utility-first styling with @tailwindcss/vite plugin
- **Lucide React** - Beautiful, consistent icons
- **MLB Stats API** - Official MLB statistics endpoint

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Datamazin/mlb-homerun-hub.git
cd mlb-homerun-hub
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
mlb-homerun-hub/
├── src/
│   ├── App.jsx           # Main application component
│   ├── mlbApi.js         # MLB Stats API service layer
│   ├── main.jsx          # React entry point
│   └── index.css         # Global styles with Tailwind
├── index.html            # HTML entry point
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── package.json          # Dependencies and scripts
```

## API Integration Details

### MLB Stats API Endpoints Used

1. **Historical Records** (All-Time Leaders)
   - Endpoint: `/api/v1/stats/leaders`
   - Parameters: `leaderCategories=homeRuns`, `statType=statsSingleSeason`, `limit=10`
   - Fetches all-time single season home run records

2. **Season Leaders**
   - Endpoint: `/api/v1/stats/leaders`
   - Parameters: `leaderCategories=homeRuns`, `season`, `statGroup=hitting`
   - Fetches top home run hitters for specified seasons

3. **Player Statistics** (Individual Seasons)
   - Endpoint: `/api/v1/people/{playerId}`
   - Hydration: `stats(group=hitting,type=season,season={year},sportId=1)`
   - Returns individual season statistics for each year (last 10 years)
   - Multiple API calls ensure accurate historical data

4. **Top Players Discovery**
   - Aggregates leaders from last 10 seasons
   - Ranks players by total home runs across the period
   - Dynamically selects top 100 performers for Active Trends visualization

### Data Flow
1. App loads and displays loading spinner
2. Fetches all-time historical records via API (with fallback to hardcoded data)
3. Fetches season leaders for last 4 years (dynamically calculated)
4. Discovers top 100 players from last 10 seasons based on total home run production
5. Fetches player trajectories for all top 100 players (10 years per player)
6. Updates UI with live data and removes loading state
7. Charts display with visible data labels and interactive tooltips

## Features in Detail

### Interactive UI
- **Tab Navigation**: Switch between Historical, Seasons, and Trends views
- **Dark Mode Support**: Automatically adapts to system preferences
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Search Functionality**: Filter historical records by player name
- **Hover Effects**: Interactive tooltips and visual feedback
- **Data Labels**: Always-visible home run counts on trajectory charts
- **Smart Loading**: Skeleton states during API data fetching

### Data Visualization
- Bar charts for player career trajectories
- Color-coded team badges and league indicators
- Ranking badges for season leaders
- Status tags for historical significance

## Future Enhancements

- [ ] Filtering/sorting options for top 100 player list
- [ ] Player comparison mode (side-by-side trajectories)
- [ ] Career home run totals and all-time rankings
- [ ] Team-by-team leaderboards
- [ ] Export data to CSV
- [ ] Advanced filtering options
- [ ] Real-time game updates during season

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Data Sources

- [MLB Stats API](https://statsapi.mlb.com/api/)
- Historical records verified against Baseball-Reference and MLB.com

## License

This project is open source and available under the MIT License.

## Copyright Notice

This application and its author are not affiliated with MLB or any MLB team. Use of MLB data is subject to the notice posted at http://gdx.mlb.com/components/copyright.txt.

---

**Built with ⚾ by a baseball statistics enthusiast**
