// MLB Stats API Service
import { cachedFetch } from './cache';

// Base URL for MLB Stats API
const BASE_URL = 'https://statsapi.mlb.com/api/v1';

// Stat Types Configuration
export const STAT_TYPES = {
  // Batting Stats
  homeRuns: {
    key: 'homeRuns',
    label: 'Home Runs',
    abbr: 'HR',
    apiParam: 'homeRuns',
    category: 'hitting',
    color: 'blue',
    format: (val) => Math.round(val)
  },
  rbi: {
    key: 'rbi',
    label: 'RBIs',
    abbr: 'RBI',
    apiParam: 'rbi',
    category: 'hitting',
    color: 'purple',
    format: (val) => Math.round(val)
  },
  hits: {
    key: 'hits',
    label: 'Hits',
    abbr: 'H',
    apiParam: 'hits',
    category: 'hitting',
    color: 'green',
    format: (val) => Math.round(val)
  },
  stolenBases: {
    key: 'stolenBases',
    label: 'Stolen Bases',
    abbr: 'SB',
    apiParam: 'stolenBases',
    category: 'hitting',
    color: 'orange',
    format: (val) => Math.round(val)
  },
  battingAverage: {
    key: 'battingAverage',
    label: 'Batting Average',
    abbr: 'AVG',
    apiParam: 'battingAverage',
    category: 'hitting',
    color: 'red',
    format: (val) => val.toFixed(3)
  },
  // Pitching Stats
  earnedRunAverage: {
    key: 'earnedRunAverage',
    label: 'Earned Run Average',
    abbr: 'ERA',
    apiParam: 'earnedRunAverage',
    category: 'pitching',
    color: 'blue',
    format: (val) => val.toFixed(2),
    lowerIsBetter: true
  },
  strikeouts: {
    key: 'strikeouts',
    label: 'Strikeouts',
    abbr: 'K',
    apiParam: 'strikeOuts',
    category: 'pitching',
    color: 'purple',
    format: (val) => Math.round(val)
  },
  wins: {
    key: 'wins',
    label: 'Wins',
    abbr: 'W',
    apiParam: 'wins',
    category: 'pitching',
    color: 'green',
    format: (val) => Math.round(val)
  },
  saves: {
    key: 'saves',
    label: 'Saves',
    abbr: 'SV',
    apiParam: 'saves',
    category: 'pitching',
    color: 'orange',
    format: (val) => Math.round(val)
  },
  whip: {
    key: 'whip',
    label: 'WHIP',
    abbr: 'WHIP',
    apiParam: 'whip',
    category: 'pitching',
    color: 'red',
    format: (val) => val.toFixed(3),
    lowerIsBetter: true
  }
};

// MLB Team ID to Abbreviation mapping
// Source: https://statsapi.mlb.com/api/v1/teams
const TEAM_ABBREVIATIONS = {
  108: 'LAA', 109: 'ARI', 110: 'BAL', 111: 'BOS', 112: 'CHC',
  113: 'CIN', 114: 'CLE', 115: 'COL', 116: 'DET', 117: 'HOU',
  118: 'KC',  119: 'LAD', 120: 'WSH', 121: 'NYM', 133: 'OAK',
  134: 'PIT', 135: 'SD',  136: 'SEA', 137: 'SF',  138: 'STL',
  139: 'TB',  140: 'TEX', 141: 'TOR', 142: 'MIN', 143: 'PHI',
  144: 'ATL', 145: 'CWS', 146: 'MIA', 147: 'NYY', 158: 'MIL'
};

/**
 * Format stat value based on stat type
 * @param {number} value - The stat value
 * @param {string} statType - The stat type key
 * @returns {string} Formatted stat value
 */
export function formatStatValue(value, statType) {
  const stat = STAT_TYPES[statType];
  if (!stat) return value;
  return stat.format(value);
}

/**
 * Get the current baseball season year
 * If current month is Jan-Apr, use previous year (offseason)
 */
export function getCurrentBaseballSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed (0 = January, 3 = April)
  
  // If January through April (months 0-3), use previous year
  return month <= 3 ? year - 1 : year;
}

/**
 * Get array of last N baseball seasons
 */
export function getLastNSeasons(n = 10) {
  const currentSeason = getCurrentBaseballSeason();
  const seasons = [];
  for (let i = 0; i < n; i++) {
    seasons.push(currentSeason - i);
  }
  return seasons;
}

/**
 * Fetch season leaders for a given stat type
 * @param {number} season - The season year
 * @param {string} statType - The stat type key (e.g., 'homeRuns', 'rbi')
 */
export async function getSeasonLeaders(season, statType = 'homeRuns') {
  const stat = STAT_TYPES[statType];
  if (!stat) {
    console.error(`Invalid stat type: ${statType}`);
    return [];
  }

  return cachedFetch(`season_leaders_${season}_${statType}`, async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/stats/leaders?leaderCategories=${stat.apiParam}&season=${season}&statGroup=${stat.category}&limit=16&leaderGameTypes=R&sportId=1`
      );
      const data = await response.json();
    
    if (!data.leagueLeaders?.[0]?.leaders) return [];
    
    return data.leagueLeaders[0].leaders.map(leader => {
      // Use team ID mapping for accurate abbreviations (NYY, NYM, etc.)
      const teamAbbr = TEAM_ABBREVIATIONS[leader.team?.id] || 
                       leader.team?.name?.substring(0, 3).toUpperCase();
      
      const statValue = statType === 'battingAverage' 
        ? parseFloat(leader.value) 
        : parseInt(leader.value);
      
      return {
        player: leader.person.fullName,
        personId: leader.person.id,
        team: teamAbbr,
        teamId: leader.team?.id,
        statValue: statValue,
        statType: stat,
        // Keep legacy 'hr' field for backwards compatibility
        hr: statType === 'homeRuns' ? statValue : undefined,
        league: leader.league?.abbreviation || 'MLB'
      };
    });
    } catch (error) {
      console.error(`Error fetching ${season} season leaders:`, error);
      return [];
    }
  });
}

/**
 * Fetch multiple seasons of leaders (parallelized)
 * @param {number[]} seasons - Array of season years
 * @param {string} statType - The stat type key
 */
export async function getMultipleSeasonLeaders(seasons = null, statType = 'homeRuns') {
  // If no seasons provided, get last 4 seasons
  const seasonsToFetch = seasons || getLastNSeasons(4);
  
  // Fetch all seasons in parallel
  const leadersPromises = seasonsToFetch.map(season => 
    getSeasonLeaders(season, statType).then(leaders => ({ season, leaders }))
  );
  
  const leadersResults = await Promise.all(leadersPromises);
  
  const results = {};
  leadersResults.forEach(({ season, leaders }) => {
    if (leaders.length > 0) {
      results[season] = leaders.slice(0, 16); // Top 16 per season
    }
  });
  
  return results;
}

/**
 * Get top players dynamically from the past N seasons (parallelized & cached)
 * Returns array of {name, id, totalStat} sorted by total stat value
 * @param {number} numSeasons - Number of seasons to analyze
 * @param {number} limit - Number of top players to return
 * @param {string} statType - The stat type key
 */
export async function getTopPlayersFromSeasons(numSeasons = 10, limit = 20, statType = 'homeRuns') {
  return cachedFetch(`top_players_${numSeasons}_${limit}_${statType}`, async () => {
    try {
      const seasons = getLastNSeasons(numSeasons);
      const playerMap = new Map();
      
      // Fetch all season leaders in parallel
      const leadersPromises = seasons.map(season => getSeasonLeaders(season, statType));
      const allLeaders = await Promise.all(leadersPromises);
      
      // Aggregate players and their stats
      allLeaders.forEach((leaders, idx) => {
        const season = seasons[idx];
        leaders.forEach(leader => {
          const existingPlayer = playerMap.get(leader.player);
          if (existingPlayer) {
            existingPlayer.totalStat += leader.statValue;
            existingPlayer.appearances += 1;
            existingPlayer.seasons.push(season);
            existingPlayer.id = existingPlayer.id || leader.personId;
          } else {
            playerMap.set(leader.player, {
              name: leader.player,
              id: leader.personId,
              totalStat: leader.statValue,
              appearances: 1,
              seasons: [season]
            });
          }
        });
      });
      
      // Convert to array and sort by total stat value
      const sortedPlayers = Array.from(playerMap.values())
        .filter(p => p.id) // Only include players with IDs
        .sort((a, b) => b.totalStat - a.totalStat)
        .slice(0, limit);
      
      return sortedPlayers;
    } catch (error) {
      console.error('Error fetching top players:', error);
      return [];
    }
  });
}

/**
 * Get player ID by name from a specific season
 */
async function getPlayerIdByName(playerName, season) {
  try {
    const response = await fetch(
      `${BASE_URL}/stats/leaders?leaderCategories=homeRuns&season=${season}&statGroup=hitting&limit=50&leaderGameTypes=R&sportId=1`
    );
    const data = await response.json();
    
    if (!data.leagueLeaders?.[0]?.leaders) return null;
    
    const leader = data.leagueLeaders[0].leaders.find(
      l => l.person.fullName === playerName
    );
    
    return leader ? leader.person.id : null;
  } catch (error) {
    console.error(`Error getting player ID for ${playerName}:`, error);
    return null;
  }
}

/**
 * Fetch player season stats for trajectory (parallelized & cached)
 * @param {number} playerId - Player ID
 * @param {number[]} seasons - Array of season years
 * @param {string} statType - The stat type key (e.g., 'homeRuns', 'hits')
 */
export async function getPlayerTrajectory(playerId, seasons = [], statType = 'homeRuns') {
  const stat = STAT_TYPES[statType];
  return cachedFetch(`trajectory_${playerId}_${seasons.join('_')}_${statType}`, async () => {
    try {
      // Fetch all seasons in parallel
      const fetchPromises = seasons.map(season =>
        fetch(`${BASE_URL}/people/${playerId}?hydrate=stats(group=${stat.category},type=season,season=${season},sportId=1)`)
          .then(res => res.json())
          .then(data => {
            if (data.people?.[0]?.stats?.[0]?.splits?.[0]) {
              const split = data.people[0].stats[0].splits[0];
              const statValue = statType === 'battingAverage'
                ? parseFloat(split.stat[stat.apiParam] || 0)
                : parseInt(split.stat[stat.apiParam] || 0);
              return {
                year: parseInt(split.season),
                statValue: statValue,
                hr: statType === 'homeRuns' ? statValue : undefined // Keep for backwards compatibility
              };
            }
            return null;
          })
          .catch(() => null)
      );
      
      const results = await Promise.all(fetchPromises);
      const trajectory = results.filter(r => r !== null);
      
      return trajectory.sort((a, b) => a.year - b.year);
    } catch (error) {
      console.error(`Error fetching player trajectory for ${playerId}:`, error);
      return [];
    }
  });
}

/**
 * Search for a player by name
 */
export async function searchPlayer(name) {
  try {
    const response = await fetch(
      `${BASE_URL}/sports/1/players?season=2025&gameType=R`
    );
    const data = await response.json();
    
    const players = data.people || [];
    return players.filter(p => 
      p.fullName.toLowerCase().includes(name.toLowerCase())
    ).slice(0, 5);
  } catch (error) {
    console.error('Error searching for player:', error);
    return [];
  }
}

/**
 * Get notable player IDs (hardcoded for known stars - DEPRECATED, use getTopPlayersFromSeasons)
 * Kept for backwards compatibility
 */
export const NOTABLE_PLAYERS = {
  'Aaron Judge': 592450,
  'Shohei Ohtani': 660271,
  'Giancarlo Stanton': 519317,
  'Pete Alonso': 624413,
  'Kyle Schwarber': 656941,
  'Matt Olson': 621566
};

/**
 * Fetch historical single season records from MLB API (cached)
 * @param {string} statType - The stat type key
 */
export async function getHistoricalRecords(statType = 'homeRuns') {
  const stat = STAT_TYPES[statType];
  if (!stat) {
    console.error(`Invalid stat type: ${statType}`);
    return [];
  }

  return cachedFetch(`historical_records_${statType}`, async () => {
    try {
      // Note: MLB API's statsSingleSeason is unreliable for some stats
      // Always use fallback for non-home run stats
      const unreliableStats = ['hits', 'rbi', 'stolenBases', 'battingAverage', 'earnedRunAverage', 'strikeouts', 'wins', 'saves', 'whip'];
      if (unreliableStats.includes(statType)) {
        console.log(`Using fallback data for ${statType} - API unreliable`);
        return getHistoricalRecordsFallback(statType);
      }
      
      const response = await fetch(
        `${BASE_URL}/stats/leaders?leaderCategories=${stat.apiParam}&statType=statsSingleSeason&limit=10&sportId=1`
      );
      const data = await response.json();
    
    if (!data.leagueLeaders?.[0]?.leaders) {
      console.error('No historical leaders data found');
      return getHistoricalRecordsFallback(statType);
    }
    
    const leaders = data.leagueLeaders[0].leaders;
    
    // Validate data - check if values seem reasonable for single season
    const firstValue = leaders[0] ? parseFloat(leaders[0].value) : 0;
    
    // If hits > 300 or RBI > 200, likely getting career stats instead of season
    if ((statType === 'hits' && firstValue > 300) || 
        (statType === 'rbi' && firstValue > 200) ||
        (statType === 'stolenBases' && firstValue > 150)) {
      console.warn(`API returning unrealistic ${statType} values - using fallback data`);
      return getHistoricalRecordsFallback(statType);
    }
    
    // Map and determine status for each record
    return leaders.map((leader, index) => {
      const year = leader.season ? parseInt(leader.season) : null;
      const statValue = statType === 'battingAverage' 
        ? parseFloat(leader.value) 
        : parseInt(leader.value);
      const player = leader.person.fullName;
      const teamId = leader.team?.id;
      const team = TEAM_ABBREVIATIONS[teamId] || leader.team?.name?.substring(0, 3).toUpperCase();
      
      // Determine status based on ranking and other criteria
      let status = '';
      if (index === 0) {
        status = 'All-Time Record';
      } else if (statType === 'homeRuns' && player === 'Aaron Judge' && statValue === 62) {
        status = 'AL Record';
      } else if (statType === 'homeRuns' && player === 'Roger Maris') {
        status = 'AL Record (Former)';
      } else if (player === 'Babe Ruth') {
        status = 'Historical Legend';
      } else if (year && year >= 1998 && year <= 2001) {
        status = index === 1 ? 'NL Record (Former)' : 'Active Era';
      } else if (year && year >= 2020) {
        status = 'Modern Era';
      } else {
        status = 'Historic Record';
      }
      
      return {
        rank: index + 1,
        player,
        personId: leader.person.id,
        team,
        teamId,
        statValue: statValue,
        statType: stat,
        // Keep legacy 'hr' field for backwards compatibility
        hr: statType === 'homeRuns' ? statValue : undefined,
        year,
        status
      };
    });
  } catch (error) {
    console.error('Error fetching historical records:', error);
    return getHistoricalRecordsFallback(statType);
    }
  }, 24 * 60 * 60 * 1000); // Cache for 24 hours (historical data doesn't change)
}

/**
 * Fallback historical records data when API fails or returns incorrect data
 * @param {string} statType - The stat type key
 */
function getHistoricalRecordsFallback(statType) {
  const stat = STAT_TYPES[statType];
  
  const fallbackData = {
    homeRuns: [
      { rank: 1, player: "Barry Bonds", personId: 111188, team: "SF", teamId: 137, statValue: 73, year: 2001, status: "All-Time Record" },
      { rank: 2, player: "Mark McGwire", personId: 118219, team: "STL", teamId: 138, statValue: 70, year: 1998, status: "NL Record (Former)" },
      { rank: 3, player: "Sammy Sosa", personId: 121471, team: "CHC", teamId: 112, statValue: 66, year: 1998, status: "Active Era" },
      { rank: 4, player: "Mark McGwire", personId: 118219, team: "STL", teamId: 138, statValue: 65, year: 1999, status: "Active Era" },
      { rank: 5, player: "Sammy Sosa", personId: 121471, team: "CHC", teamId: 112, statValue: 64, year: 2001, status: "Active Era" },
      { rank: 6, player: "Sammy Sosa", personId: 121471, team: "CHC", teamId: 112, statValue: 63, year: 1999, status: "Active Era" },
      { rank: 7, player: "Aaron Judge", personId: 592450, team: "NYY", teamId: 147, statValue: 62, year: 2022, status: "AL Record" },
      { rank: 8, player: "Roger Maris", personId: 118140, team: "NYY", teamId: 147, statValue: 61, year: 1961, status: "AL Record (Former)" },
      { rank: 9, player: "Babe Ruth", personId: 121093, team: "NYY", teamId: 147, statValue: 60, year: 1927, status: "Historical Legend" }
    ],
    hits: [
      { rank: 1, player: "Ichiro Suzuki", personId: 400085, team: "SEA", teamId: 136, statValue: 262, year: 2004, status: "All-Time Record" },
      { rank: 2, player: "George Sisler", personId: 121365, team: "STL", teamId: 138, statValue: 257, year: 1920, status: "Historic Record" },
      { rank: 3, player: "Lefty O'Doul", personId: 118666, team: "PHI", teamId: 143, statValue: 254, year: 1929, status: "Historic Record" },
      { rank: 4, player: "Bill Terry", personId: 122043, team: "NYG", teamId: 137, statValue: 254, year: 1930, status: "Historic Record" },
      { rank: 5, player: "Al Simmons", personId: 121352, team: "PHI", teamId: 143, statValue: 253, year: 1925, status: "Historic Record" },
      { rank: 6, player: "Rogers Hornsby", personId: 116511, team: "STL", teamId: 138, statValue: 250, year: 1922, status: "Historic Record" },
      { rank: 7, player: "Chuck Klein", personId: 117137, team: "PHI", teamId: 143, statValue: 250, year: 1930, status: "Historic Record" },
      { rank: 8, player: "Ty Cobb", personId: 112935, team: "DET", teamId: 116, statValue: 248, year: 1911, status: "Historical Legend" }
    ],
    rbi: [
      { rank: 1, player: "Hack Wilson", personId: 123160, team: "CHC", teamId: 112, statValue: 191, year: 1930, status: "All-Time Record" },
      { rank: 2, player: "Lou Gehrig", personId: 115167, team: "NYY", teamId: 147, statValue: 185, year: 1931, status: "Historical Legend" },
      { rank: 3, player: "Hank Greenberg", personId: 115600, team: "DET", teamId: 116, statValue: 183, year: 1937, status: "Historic Record" },
      { rank: 4, player: "Lou Gehrig", personId: 115167, team: "NYY", teamId: 147, statValue: 174, year: 1927, status: "Historical Legend" },
      { rank: 5, player: "Jimmie Foxx", personId: 114945, team: "BOS", teamId: 111, statValue: 175, year: 1938, status: "Historic Record" },
      { rank: 6, player: "Lou Gehrig", personId: 115167, team: "NYY", teamId: 147, statValue: 173, year: 1930, status: "Historical Legend" },
      { rank: 7, player: "Babe Ruth", personId: 121093, team: "NYY", teamId: 147, statValue: 171, year: 1921, status: "Historical Legend" },
      { rank: 8, player: "Sammy Sosa", personId: 121471, team: "CHC", teamId: 112, statValue: 160, year: 2001, status: "Modern Era" }
    ],
    stolenBases: [
      { rank: 1, player: "Hugh Nicol", personId: 118617, team: "CIN", teamId: 113, statValue: 138, year: 1887, status: "All-Time Record" },
      { rank: 2, player: "Rickey Henderson", personId: 116282, team: "OAK", teamId: 133, statValue: 130, year: 1982, status: "Modern Record" },
      { rank: 3, player: "Arlie Latham", personId: 117607, team: "STL", teamId: 138, statValue: 129, year: 1887, status: "Historic Record" },
      { rank: 4, player: "Lou Brock", personId: 111979, team: "STL", teamId: 138, statValue: 118, year: 1974, status: "Historic Record" },
      { rank: 5, player: "Charlie Comiskey", personId: 113093, team: "STL", teamId: 138, statValue: 117, year: 1887, status: "Historic Record" },
      { rank: 6, player: "Rickey Henderson", personId: 116282, team: "OAK", teamId: 133, statValue: 108, year: 1983, status: "Modern Record" },
      { rank: 7, player: "Vince Coleman", personId: 113045, team: "STL", teamId: 138, statValue: 110, year: 1985, status: "Modern Era" },
      { rank: 8, player: "Vince Coleman", personId: 113045, team: "STL", teamId: 138, statValue: 109, year: 1987, status: "Modern Era" }
    ],
    battingAverage: [
      { rank: 1, player: "Hugh Duffy", personId: 114358, team: "BOS", teamId: 111, statValue: 0.440, year: 1894, status: "All-Time Record" },
      { rank: 2, player: "Tip O'Neill", personId: 118664, team: "STL", teamId: 138, statValue: 0.435, year: 1887, status: "Historic Record" },
      { rank: 3, player: "Pete Browning", personId: 112059, team: "LOU", teamId: 0, statValue: 0.457, year: 1887, status: "Historic Record" },
      { rank: 4, player: "Willie Keeler", personId: 117023, team: "BAL", teamId: 110, statValue: 0.424, year: 1897, status: "Historic Record" },
      { rank: 5, player: "Rogers Hornsby", personId: 116511, team: "STL", teamId: 138, statValue: 0.424, year: 1924, status: "Historic Record" },
      { rank: 6, player: "Nap Lajoie", personId: 117552, team: "PHI", teamId: 143, statValue: 0.426, year: 1901, status: "Historic Record" },
      { rank: 7, player: "George Sisler", personId: 121365, team: "STL", teamId: 138, statValue: 0.420, year: 1922, status: "Historic Record" },
      { rank: 8, player: "Ty Cobb", personId: 112935, team: "DET", teamId: 116, statValue: 0.420, year: 1911, status: "Historical Legend" }
    ],
    earnedRunAverage: [
      { rank: 1, player: "Dutch Leonard", personId: 117683, team: "BOS", teamId: 111, statValue: 0.96, year: 1914, status: "All-Time Record" },
      { rank: 2, player: "Mordecai Brown", personId: 112063, team: "CHC", teamId: 112, statValue: 1.04, year: 1906, status: "Dead Ball Era" },
      { rank: 3, player: "Bob Gibson", personId: 115178, team: "STL", teamId: 138, statValue: 1.12, year: 1968, status: "Expansion Era" },
      { rank: 4, player: "Christy Mathewson", personId: 118161, team: "NYG", teamId: 137, statValue: 1.14, year: 1909, status: "Dead Ball Era" },
      { rank: 5, player: "Walter Johnson", personId: 116911, team: "WSH", teamId: 120, statValue: 1.14, year: 1913, status: "Dead Ball Era" },
      { rank: 6, player: "Jack Pfiester", personId: 119261, team: "CHC", teamId: 112, statValue: 1.15, year: 1907, status: "Dead Ball Era" },
      { rank: 7, player: "Addie Joss", personId: 116922, team: "CLE", teamId: 114, statValue: 1.16, year: 1908, status: "Dead Ball Era" },
      { rank: 8, player: "Carl Lundgren", personId: 117981, team: "CHC", teamId: 112, statValue: 1.17, year: 1907, status: "Dead Ball Era" }
    ],
    strikeouts: [
      { rank: 1, player: "Nolan Ryan", personId: 121188, team: "CAL", teamId: 108, statValue: 383, year: 1973, status: "All-Time Record" },
      { rank: 2, player: "Sandy Koufax", personId: 117251, team: "LAD", teamId: 119, statValue: 382, year: 1965, status: "Expansion Era" },
      { rank: 3, player: "Randy Johnson", personId: 116539, team: "ARI", teamId: 109, statValue: 372, year: 2001, status: "Modern Era" },
      { rank: 4, player: "Nolan Ryan", personId: 121188, team: "CAL", teamId: 108, statValue: 367, year: 1974, status: "Expansion Era" },
      { rank: 5, player: "Randy Johnson", personId: 116539, team: "ARI", teamId: 109, statValue: 364, year: 1999, status: "Contemporary Era" },
      { rank: 6, player: "Nolan Ryan", personId: 121188, team: "HOU", teamId: 117, statValue: 341, year: 1987, status: "Expansion Era" },
      { rank: 7, player: "Nolan Ryan", personId: 121188, team: "TEX", teamId: 140, statValue: 332, year: 1989, status: "Contemporary Era" },
      { rank: 8, player: "Curt Schilling", personId: 121213, team: "ARI", teamId: 109, statValue: 319, year: 2002, status: "Recent Record" }
    ],
    wins: [
      { rank: 1, player: "Jack Chesbro", personId: 112725, team: "NYY", teamId: 147, statValue: 41, year: 1904, status: "All-Time Record" },
      { rank: 2, player: "Ed Walsh", personId: 123092, team: "CWS", teamId: 145, statValue: 40, year: 1908, status: "Dead Ball Era" },
      { rank: 3, player: "Christy Mathewson", personId: 118161, team: "NYG", teamId: 137, statValue: 37, year: 1908, status: "Dead Ball Era" },
      { rank: 4, player: "Walter Johnson", personId: 116911, team: "WSH", teamId: 120, statValue: 36, year: 1913, status: "Dead Ball Era" },
      { rank: 5, player: "Joe McGinnity", personId: 118223, team: "NYG", teamId: 137, statValue: 35, year: 1904, status: "Dead Ball Era" },
      { rank: 6, player: "Smoky Joe Wood", personId: 123172, team: "BOS", teamId: 111, statValue: 34, year: 1912, status: "Dead Ball Era" },
      { rank: 7, player: "Cy Young", personId: 124156, team: "BOS", teamId: 111, statValue: 33, year: 1901, status: "Dead Ball Era" },
      { rank: 8, player: "Denny McLain", personId: 118207, team: "DET", teamId: 116, statValue: 31, year: 1968, status: "Expansion Era" }
    ],
    saves: [
      { rank: 1, player: "Francisco Rodríguez", personId: 121359, team: "LAA", teamId: 108, statValue: 62, year: 2008, status: "All-Time Record" },
      { rank: 2, player: "Bobby Thigpen", personId: 122045, team: "CWS", teamId: 145, statValue: 57, year: 1990, status: "Contemporary Era" },
      { rank: 3, player: "John Smoltz", personId: 121371, team: "ATL", teamId: 144, statValue: 55, year: 2002, status: "Recent Record" },
      { rank: 4, player: "Eric Gagné", personId: 115030, team: "LAD", teamId: 119, statValue: 55, year: 2003, status: "Recent Record" },
      { rank: 5, player: "Dennis Eckersley", personId: 114404, team: "OAK", teamId: 133, statValue: 51, year: 1992, status: "Contemporary Era" },
      { rank: 6, player: "Trevor Hoffman", personId: 116440, team: "SD", teamId: 135, statValue: 53, year: 1998, status: "Contemporary Era" },
      { rank: 7, player: "Randy Myers", personId: 118640, team: "CHC", teamId: 112, statValue: 53, year: 1993, status: "Contemporary Era" },
      { rank: 8, player: "Mariano Rivera", personId: 121250, team: "NYY", teamId: 147, statValue: 53, year: 2004, status: "Recent Record" }
    ],
    whip: [
      { rank: 1, player: "Pedro Martínez", personId: 118173, team: "BOS", teamId: 111, statValue: 0.737, year: 2000, status: "All-Time Record" },
      { rank: 2, player: "Guy Hecker", personId: 116184, team: "LOU", teamId: 0, statValue: 0.808, year: 1882, status: "Historic Record" },
      { rank: 3, player: "Walter Johnson", personId: 116911, team: "WSH", teamId: 120, statValue: 0.780, year: 1913, status: "Dead Ball Era" },
      { rank: 4, player: "Pedro Martínez", personId: 118173, team: "BOS", teamId: 111, statValue: 0.791, year: 1999, status: "Contemporary Era" },
      { rank: 5, player: "Mordecai Brown", personId: 112063, team: "CHC", teamId: 112, statValue: 0.805, year: 1906, status: "Dead Ball Era" },
      { rank: 6, player: "Christy Mathewson", personId: 118161, team: "NYG", teamId: 137, statValue: 0.827, year: 1909, status: "Dead Ball Era" },
      { rank: 7, player: "Bob Gibson", personId: 115178, team: "STL", teamId: 138, statValue: 0.853, year: 1968, status: "Expansion Era" },
      { rank: 8, player: "Randy Johnson", personId: 116539, team: "ARI", teamId: 109, statValue: 0.866, year: 1995, status: "Contemporary Era" }
    ]
  };

  const records = fallbackData[statType] || fallbackData.homeRuns;
  
  return records.map(record => ({
    ...record,
    statType: stat,
    hr: statType === 'homeRuns' ? record.statValue : undefined
  }));
}

/**
 * Get active career home run leader (cached)
 * Fetches current season leaders and returns the one with highest career total
 * Only includes players active in the current season
 */
export async function getActiveCareerLeader(statType = 'homeRuns') {
  const currentSeason = getCurrentBaseballSeason();
  
  return cachedFetch(`active_career_leader_${statType}_${currentSeason}`, async () => {
    try {
      // Get top 10 players from current season to find active career leader
      const leaders = await getSeasonLeaders(currentSeason, statType);
      
      if (!leaders || leaders.length === 0) {
        console.error('No season leaders found for', statType);
        return { player: 'N/A', statValue: 0 }; // Fallback
      }
      
      // Return the top leader
      const topLeader = leaders[0];
      return {
        player: topLeader.player.split(' ').pop(), // Last name only
        statValue: topLeader.statValue
      };
    } catch (error) {
      console.error('Error fetching active career leader:', error);
      return { player: 'N/A', statValue: 0 }; // Fallback
    }
  });
}
