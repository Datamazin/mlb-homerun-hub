import { useState, useMemo, useEffect } from 'react'
import { Search, Trophy, TrendingUp, History, User, Calendar, Info } from 'lucide-react'
import { getHistoricalRecords, getMultipleSeasonLeaders, getPlayerTrajectory, getTopPlayersFromSeasons, getCurrentBaseballSeason, getLastNSeasons, getActiveCareerLeader, STAT_TYPES, formatStatValue } from './mlbApi'
import { staleWhileRevalidate } from './cache'

function App() {
  const currentSeason = getCurrentBaseballSeason();
  const availableSeasons = getLastNSeasons(10);
  
  const [selectedSeason, setSelectedSeason] = useState(currentSeason);
  const [selectedCategory, setSelectedCategory] = useState('hitting');
  const [selectedStat, setSelectedStat] = useState('homeRuns');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('historical');
  const [loading, setLoading] = useState(true);
  const [trajectoriesLoaded, setTrajectoriesLoaded] = useState({});
  const [historicalRecords, setHistoricalRecords] = useState([]);
  const [seasonLeaders, setSeasonLeaders] = useState({});
  const [playerTrajectories, setPlayerTrajectories] = useState({});
  const [activeCareerLeader, setActiveCareerLeader] = useState(null);

  // Fetch data on component mount with stale-while-revalidate
  // Re-fetch when selectedStat changes
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch critical data in parallel with SWR pattern
        const [historical, leaders, careerLeader] = await Promise.all([
          // Use SWR to show cached data immediately, fetch fresh in background
          staleWhileRevalidate(
            `initial_historical_${selectedStat}`,
            () => getHistoricalRecords(selectedStat),
            (freshData) => setHistoricalRecords(freshData)
          ),
          staleWhileRevalidate(
            `initial_leaders_${selectedStat}`,
            () => getMultipleSeasonLeaders(getLastNSeasons(10), selectedStat),
            (freshData) => setSeasonLeaders(freshData)
          ),
          staleWhileRevalidate(
            'initial_career_leader',
            () => getActiveCareerLeader(),
            (freshData) => setActiveCareerLeader(freshData)
          )
        ]);
        
        // Set initial cached data (may be null on first visit)
        if (historical) setHistoricalRecords(historical);
        if (leaders) setSeasonLeaders(leaders);
        if (careerLeader) setActiveCareerLeader(careerLeader);
        
      } catch (error) {
        console.error('Error fetching MLB data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedStat]);

  // Lazy load trajectories when Active Trends tab is opened
  useEffect(() => {
    async function loadTrajectories() {
      const cacheKey = `${selectedStat}_trajectories`;
      if (activeTab === 'trends' && !trajectoriesLoaded[cacheKey]) {
        console.log('⚡ Lazy loading trajectories for', selectedStat);
        try {
          // Fetch top 20 players from last 10 seasons
          const topPlayers = await getTopPlayersFromSeasons(10, 20, selectedStat);
          console.log(`Fetched ${topPlayers.length} top players for trajectories`);
          
          // Fetch player trajectories in batches of 5 to prevent overwhelming the API
          const trajectoryYears = getLastNSeasons(10);
          const trajectories = {};
          
          const batchSize = 5;
          for (let i = 0; i < topPlayers.length; i += batchSize) {
            const batch = topPlayers.slice(i, i + batchSize);
            const batchPromises = batch.map(player =>
              getPlayerTrajectory(player.id, trajectoryYears, selectedStat).then(data => ({
                name: player.name,
                id: player.id,
                data
              }))
            );
            
            const results = await Promise.all(batchPromises);
            results.forEach(({ name, id, data }) => {
              if (data.length > 0) {
                trajectories[name] = { data, id };
              }
            });
          }
          
          setPlayerTrajectories(prev => ({ ...prev, [cacheKey]: trajectories }));
          setTrajectoriesLoaded(prev => ({ ...prev, [cacheKey]: true }));
          console.log('✅ Trajectories loaded successfully');
        } catch (error) {
          console.error('Error loading trajectories:', error);
        }
      }
    }
    
    loadTrajectories();
  }, [activeTab, selectedStat]);

  const filteredHistory = useMemo(() => {
    return historicalRecords.filter(r => 
      r.player.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, historicalRecords]);

  // Filter stats by selected category
  const availableStats = useMemo(() => {
    return Object.entries(STAT_TYPES)
      .filter(([key, stat]) => stat.category === selectedCategory)
      .reduce((acc, [key, stat]) => ({ ...acc, [key]: stat }), {});
  }, [selectedCategory]);

  // Calculate stats for display
  const currentSeasonLeader = seasonLeaders[currentSeason]?.[0];
  const maxHistoricalRecord = historicalRecords[0];
  const currentStat = STAT_TYPES[selectedStat];

  const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center space-x-4 transition-transform hover:scale-[1.02]">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-4 md:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <Trophy className="text-amber-500" /> MLB Stats Hub
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Tracking historical greatness and modern power.</p>
          </div>

          {/* Category and Stat Selectors */}
          <div className="flex items-center gap-6">
            {/* Category Selector */}
            <div className="flex items-center gap-3">
              <label htmlFor="category-selector" className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Category:
              </label>
              <select 
                id="category-selector"
                value={selectedCategory}
                onChange={(e) => {
                  const newCategory = e.target.value;
                  setSelectedCategory(newCategory);
                  // Set first stat of new category
                  const firstStat = Object.keys(STAT_TYPES).find(key => STAT_TYPES[key].category === newCategory);
                  if (firstStat) setSelectedStat(firstStat);
                }}
                className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="hitting">Batting</option>
                <option value="pitching">Pitching</option>
              </select>
            </div>
            
            {/* Stat Selector */}
            <div className="flex items-center gap-3">
              <label htmlFor="stat-selector" className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Stat:
              </label>
              <select 
                id="stat-selector"
                value={selectedStat}
                onChange={(e) => setSelectedStat(e.target.value)}
                className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                {Object.values(availableStats).map(stat => (
                  <option key={stat.key} value={stat.key}>
                    {stat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1 shadow-inner border border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => setActiveTab('historical')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'historical' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Historical Records
          </button>
          <button 
            onClick={() => setActiveTab('seasons')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'seasons' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Yearly Leaders
          </button>
          <button 
            onClick={() => setActiveTab('trends')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'trends' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Active Trends
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        
        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-slate-500">Loading MLB data...</p>
          </div>
        )}

        {/* Quick Stats Banner */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              label={`Single Season Record (${currentStat.abbr})`}
              value={maxHistoricalRecord ? `${formatStatValue(maxHistoricalRecord.statValue, selectedStat)} (${maxHistoricalRecord.player.split(' ').pop()}, ${maxHistoricalRecord.year})` : "Loading..."}
              icon={History} 
              color="bg-blue-500" 
            />
            <StatCard 
              label={`Current Season Leader (${currentStat.abbr})`}
              value={currentSeasonLeader ? `${formatStatValue(currentSeasonLeader.statValue, selectedStat)} (${currentSeasonLeader.player.split(' ').pop()}, ${currentSeason})` : "Loading..."}
              icon={TrendingUp} 
              color="bg-emerald-500" 
            />
            <StatCard 
              label="Active Leader (Career HR)" 
              value={activeCareerLeader ? `${activeCareerLeader.hr} (${activeCareerLeader.player})` : "Loading..."}
              icon={User} 
              color="bg-purple-500" 
            />
          </div>
        )}

        {/* Tab Content: Historical */}
        {activeTab === 'historical' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History className="text-blue-500" size={20} /> All-Time Single Season Leaders
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Filter by player..."
                  className="pl-10 pr-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border-none text-sm focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Player</th>
                    <th className="px-6 py-4 text-center">{currentStat.abbr}</th>
                    <th className="px-6 py-4">Team</th>
                    <th className="px-6 py-4">Logo</th>
                    <th className="px-6 py-4">Year</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredHistory.map((row) => (
                    <tr key={`${row.player}-${row.year}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-400">{row.rank}</td>
                      <td className="px-6 py-4 font-semibold">
                        {row.personId ? (
                          <a 
                            href={`https://www.mlb.com/player/${row.personId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline decoration-transparent hover:decoration-current"
                          >
                            {row.player}
                          </a>
                        ) : (
                          <span className="text-slate-900 dark:text-white">{row.player}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-bold">
                          {formatStatValue(row.statValue, selectedStat)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.team}</td>
                      <td className="px-6 py-4">
                        {row.teamId && (
                          <img 
                            src={`https://www.mlbstatic.com/team-logos/${row.teamId}.svg`}
                            alt={`${row.team} logo`}
                            className="w-8 h-8 object-contain"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono">{row.year}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Seasonal Leaders */}
        {activeTab === 'seasons' && !loading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="text-emerald-500" size={24} /> 
                Yearly Leaders: <span className="text-emerald-600">{selectedSeason}</span>
              </h2>
              <select 
                value={selectedSeason} 
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500"
              >
                {availableSeasons.map(y => <option key={y} value={y}>{y} Season</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(seasonLeaders[selectedSeason] || []).map((leader, i) => (
                <a 
                  key={leader.player}
                  href={`https://www.mlb.com/player/${leader.personId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                >
                  {leader.teamId && (
                    <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <img
                        src={`https://www.mlbstatic.com/team-logos/${leader.teamId}.svg`}
                        alt={`${leader.team} logo`}
                        className="w-16 h-16 object-contain"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                  {leader.personId && (
                    <div className="flex justify-center mb-3">
                      <img
                        src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${leader.personId}/headshot/67/current`}
                        alt={leader.player}
                        className="w-[100px] h-[150px] object-cover border-4 border-white dark:border-slate-800 shadow-lg"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                  <p className="text-sm font-bold text-slate-400 mb-1">#{i + 1} {leader.league}</p>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{leader.player}</h3>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{leader.team}</p>
                      <p className="text-4xl font-black text-slate-900 dark:text-white mt-2">
                        {formatStatValue(leader.statValue, selectedStat)}
                        <span className="text-xs ml-2 text-slate-400">{currentStat.abbr}</span>
                      </p>
                    </div>
                    <div className="h-10 w-1 bg-emerald-500 rounded-full"></div>
                  </div>
                </a>
              ))}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/30">
              <Info className="text-blue-500 mt-0.5" size={20} />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {seasonLeaders[selectedSeason]?.[0] ? (
                  <>In {selectedSeason}, {seasonLeaders[selectedSeason][0].player} dominated the league with {formatStatValue(seasonLeaders[selectedSeason][0].statValue, selectedStat)} {currentStat.label.toLowerCase()}. 
                  This total represents a peak in {seasonLeaders[selectedSeason][0].league} {currentStat.category} performance.</>
                ) : (
                  'Loading season data...'
                )}
              </p>
            </div>
          </div>
        )}

        {/* Tab Content: Trends */}
        {activeTab === 'trends' && !loading && (() => {
          const cacheKey = `${selectedStat}_trajectories`;
          const currentTrajectories = playerTrajectories[cacheKey] || {};
          const isLoaded = trajectoriesLoaded[cacheKey];
          const currentStat = STAT_TYPES[selectedStat];
          
          return (
          <div>
            {/* Loading indicator for trajectories */}
            {!isLoaded && (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-slate-500">Loading player trajectories for {currentStat.label}...</p>
                <p className="mt-2 text-xs text-slate-400">Fetching data for top 20 players</p>
              </div>
            )}
            
            {/* Trajectories grid */}
            {isLoaded && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {Object.entries(currentTrajectories)
              .map(([name, { data, id }]) => ({
                name,
                id,
                data,
                total: data.reduce((sum, d) => sum + d.statValue, 0)
              }))
              .sort((a, b) => b.total - a.total)
              .map(({ name, id, data, total }) => {
              const maxStat = Math.max(...data.map(d => d.statValue));
              return (
                <div key={name} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <a 
                      href={`https://www.mlb.com/player/${id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-lg text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline decoration-transparent hover:decoration-current"
                    >
                      {name}
                    </a>
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded uppercase tracking-wider">Historical Trend</span>
                  </div>
                  
                  {/* Chart Container - Fixed Height and Flex layout fix */}
                  <div className="relative h-48 w-full flex items-end gap-2 mb-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 pt-8">
                    {data.map((d, i) => (
                      <div key={i} className="flex-1 h-full flex flex-col justify-end group relative">
                        {/* Data Label */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-700 dark:text-slate-300">
                          {formatStatValue(d.statValue, selectedStat)}
                        </div>
                        
                        {/* The Bar */}
                        <div 
                          style={{ height: `${Math.max((d.statValue / maxStat) * 100, 2)}%` }}
                          className={`w-full rounded-t-md transition-all duration-700 ease-out shadow-sm ${
                            name === 'Aaron Judge' ? 'bg-blue-500' : 
                            name === 'Shohei Ohtani' ? 'bg-red-500' : 
                            'bg-indigo-500'
                          } group-hover:brightness-110 group-hover:shadow-md`}
                        ></div>
                        
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          {formatStatValue(d.statValue, selectedStat)} {currentStat.abbr} in {d.year}
                        </div>
                        
                        {/* Year Label */}
                        <span className="text-[10px] font-mono mt-3 text-slate-400 text-center">
                          {d.year.toString().slice(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Career High</span>
                      <span className="text-sm font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{formatStatValue(maxStat, selectedStat)} {currentStat.abbr}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Average</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {formatStatValue(total / data.length, selectedStat)} {currentStat.abbr}/yr
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Total (Shown)</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {formatStatValue(total, selectedStat)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            )}
          </div>
          );
        })()}

      </main>

      <footer className="max-w-7xl mx-auto mt-20 pb-10 border-t border-slate-200 dark:border-slate-800 pt-10 text-center">
        <p className="text-slate-500 text-sm">
          Data visualization for MLB Stat Enthusiasts. Single season records include historical milestones and current 2025 leader projections.
        </p>
        <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest">Powered by Stathead & Baseball-Reference Historical Data</p>
      </footer>
    </div>
  )
}

export default App
