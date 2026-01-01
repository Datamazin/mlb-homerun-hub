// MLB Stats API Service
import { cachedFetch } from './cache';

// Base URL for MLB Stats API
const BASE_URL = 'https://statsapi.mlb.com/api/v1';

// Stat Types Configuration
export const STAT_TYPES = {
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
      // Note: MLB API's statsSingleSeason doesn't work well for all stats
      // For home runs it works, but for hits/other stats it may return career totals
      // This is a known API limitation
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
export async function getActiveCareerLeader() {
  const currentSeason = getCurrentBaseballSeason();
  
  return cachedFetch(`active_career_leader_${currentSeason}`, async () => {
    try {
      // Fetch career home run leaders filtered by players active in current season
      const response = await fetch(
        `${BASE_URL}/stats/leaders?leaderCategories=homeRuns&season=${currentSeason}&statGroup=hitting&statType=career&limit=1&playerPool=ACTIVE&leaderGameTypes=R&sportId=1`
      );
      const data = await response.json();
    
    if (!data.leagueLeaders?.[0]?.leaders?.[0]) {
      console.error('No active career leader data found');
      return { player: 'Stanton', hr: 453 }; // Fallback
    }
    
    const leader = data.leagueLeaders[0].leaders[0];
      return {
        player: leader.person.fullName.split(' ').pop(), // Last name only
        hr: parseInt(leader.value)
      };
    } catch (error) {
      console.error('Error fetching active career leader:', error);
      return { player: 'Stanton', hr: 453 }; // Fallback
    }
  });
}
