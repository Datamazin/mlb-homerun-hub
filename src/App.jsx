import { useState, useMemo, useEffect } from 'react'
import { Search, Trophy, TrendingUp, History, User, Calendar, Info } from 'lucide-react'
import { getHistoricalRecords, getMultipleSeasonLeaders, getPlayerTrajectory, getTopPlayersFromSeasons, getCurrentBaseballSeason, getLastNSeasons, getActiveCareerLeader } from './mlbApi'

function App() {
  const currentSeason = getCurrentBaseballSeason();
  const availableSeasons = getLastNSeasons(10);
  
  const [selectedSeason, setSelectedSeason] = useState(currentSeason);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('historical');
  const [loading, setLoading] = useState(true);
  const [historicalRecords, setHistoricalRecords] = useState([]);
  const [seasonLeaders, setSeasonLeaders] = useState({});
  const [playerTrajectories, setPlayerTrajectories] = useState({});
  const [activeCareerLeader, setActiveCareerLeader] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch historical records
        const historical = await getHistoricalRecords();
        setHistoricalRecords(historical);

        // Fetch season leaders for last 10 years (dynamic)
        const leaders = await getMultipleSeasonLeaders();
        setSeasonLeaders(leaders);

        // Fetch active career leader
        const careerLeader = await getActiveCareerLeader();
        setActiveCareerLeader(careerLeader);

        // Fetch top 100 players from last 10 seasons dynamically
        const topPlayers = await getTopPlayersFromSeasons(10, 100);
        console.log(`Fetched ${topPlayers.length} top players from last 10 seasons`);
        
        // Fetch player trajectories for top players (last 10 years)
        const trajectoryYears = getLastNSeasons(10);
        const trajectories = {};
        for (const player of topPlayers) {
          const data = await getPlayerTrajectory(player.id, trajectoryYears);
          if (data.length > 0) {
            trajectories[player.name] = data;
          }
        }
        setPlayerTrajectories(trajectories);
      } catch (error) {
        console.error('Error fetching MLB data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredHistory = useMemo(() => {
    return historicalRecords.filter(r => 
      r.player.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, historicalRecords]);

  // Calculate stats for display
  const currentSeasonLeader = seasonLeaders[currentSeason]?.[0];
  const maxHistoricalHR = historicalRecords[0]?.hr || 73;

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
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <Trophy className="text-amber-500" /> MLB Home Run Hub
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Tracking historical greatness and modern power surges.</p>
        </div>

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
              label="Single Season Record" 
              value={`${maxHistoricalHR} (Bonds, 2001)`}
              icon={History} 
              color="bg-blue-500" 
            />
            <StatCard 
              label="Current Season Leader" 
              value={currentSeasonLeader ? `${currentSeasonLeader.hr} (${currentSeasonLeader.player.split(' ').pop()}, ${currentSeason})` : "Loading..."}
              icon={TrendingUp} 
              color="bg-emerald-500" 
            />
            <StatCard 
              label="Active Leader (Career)" 
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
                    <th className="px-6 py-4 text-center">HR</th>
                    <th className="px-6 py-4">Team</th>
                    <th className="px-6 py-4">Year</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredHistory.map((row) => (
                    <tr key={`${row.player}-${row.year}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-400">{row.rank}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{row.player}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-bold">
                          {row.hr}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.team}</td>
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
                <div key={leader.player} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Trophy size={60} />
                  </div>
                  <p className="text-sm font-bold text-slate-400 mb-1">#{i + 1} {leader.league}</p>
                  <h3 className="text-lg font-bold mb-2">{leader.player}</h3>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{leader.team}</p>
                      <p className="text-4xl font-black text-slate-900 dark:text-white mt-2">{leader.hr}</p>
                    </div>
                    <div className="h-10 w-1 bg-emerald-500 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/30">
              <Info className="text-blue-500 mt-0.5" size={20} />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {seasonLeaders[selectedSeason]?.[0] ? (
                  <>In {selectedSeason}, {seasonLeaders[selectedSeason][0].player} dominated the league with {seasonLeaders[selectedSeason][0].hr} home runs. 
                  This total represents a peak in {seasonLeaders[selectedSeason][0].league} power hitting.</>
                ) : (
                  'Loading season data...'
                )}
              </p>
            </div>
          </div>
        )}

        {/* Tab Content: Trends */}
        {activeTab === 'trends' && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {Object.entries(playerTrajectories)
              .map(([name, data]) => ({
                name,
                data,
                total: data.reduce((sum, d) => sum + d.hr, 0)
              }))
              .sort((a, b) => b.total - a.total)
              .map(({ name, data, total }) => {
              const maxHR = Math.max(...data.map(d => d.hr));
              return (
                <div key={name} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold text-lg">{name}</h3>
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded uppercase tracking-wider">Historical Trend</span>
                  </div>
                  
                  {/* Chart Container - Fixed Height and Flex layout fix */}
                  <div className="relative h-48 w-full flex items-end gap-2 mb-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 pt-8">
                    {data.map((d, i) => (
                      <div key={i} className="flex-1 h-full flex flex-col justify-end group relative">
                        {/* Data Label */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-700 dark:text-slate-300">
                          {d.hr}
                        </div>
                        
                        {/* The Bar */}
                        <div 
                          style={{ height: `${Math.max((d.hr / 73) * 100, 2)}%` }} // Ensure at least 2% height so it's visible even if low
                          className={`w-full rounded-t-md transition-all duration-700 ease-out shadow-sm ${
                            name === 'Aaron Judge' ? 'bg-blue-500' : 
                            name === 'Shohei Ohtani' ? 'bg-red-500' : 
                            'bg-indigo-500'
                          } group-hover:brightness-110 group-hover:shadow-md`}
                        ></div>
                        
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          {d.hr} HR in {d.year}
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
                      <span className="text-sm font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{maxHR} HR</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Average</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {(total / data.length).toFixed(1)} HR/yr
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Total (Shown)</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {total}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
