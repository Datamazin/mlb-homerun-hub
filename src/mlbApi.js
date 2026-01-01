// MLB Stats API Service
import { cachedFetch } from './cache';

// Base URL for MLB Stats API
const BASE_URL = 'https://statsapi.mlb.com/api/v1';

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
 * Fetch season home run leaders
 */
export async function getSeasonLeaders(season) {
  return cachedFetch(`season_leaders_${season}`, async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/stats/leaders?leaderCategories=homeRuns&season=${season}&statGroup=hitting&limit=16&leaderGameTypes=R&sportId=1`
      );
      const data = await response.json();
    
    if (!data.leagueLeaders?.[0]?.leaders) return [];
    
    return data.leagueLeaders[0].leaders.map(leader => {
      // Use team ID mapping for accurate abbreviations (NYY, NYM, etc.)
      const teamAbbr = TEAM_ABBREVIATIONS[leader.team?.id] || 
                       leader.team?.name?.substring(0, 3).toUpperCase();
      
      return {
        player: leader.person.fullName,
        personId: leader.person.id,
        team: teamAbbr,
        teamId: leader.team?.id,
        hr: parseInt(leader.value),
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
 */
export async function getMultipleSeasonLeaders(seasons = null) {
  // If no seasons provided, get last 4 seasons
  const seasonsToFetch = seasons || getLastNSeasons(4);
  
  // Fetch all seasons in parallel
  const leadersPromises = seasonsToFetch.map(season => 
    getSeasonLeaders(season).then(leaders => ({ season, leaders }))
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
 * Returns array of {name, id, totalHR} sorted by total home runs
 */
export async function getTopPlayersFromSeasons(numSeasons = 10, limit = 20) {
  return cachedFetch(`top_players_${numSeasons}_${limit}`, async () => {
    try {
      const seasons = getLastNSeasons(numSeasons);
      const playerMap = new Map();
      
      // Fetch all season leaders in parallel
      const leadersPromises = seasons.map(season => getSeasonLeaders(season));
      const allLeaders = await Promise.all(leadersPromises);
      
      // Aggregate players and their stats
      allLeaders.forEach((leaders, idx) => {
        const season = seasons[idx];
        leaders.forEach(leader => {
          const existingPlayer = playerMap.get(leader.player);
          if (existingPlayer) {
            existingPlayer.totalHR += leader.hr;
            existingPlayer.appearances += 1;
            existingPlayer.seasons.push(season);
            existingPlayer.id = existingPlayer.id || leader.personId; // Use ID from API response
          } else {
            playerMap.set(leader.player, {
              name: leader.player,
              id: leader.personId, // Already have ID from getSeasonLeaders
              totalHR: leader.hr,
              appearances: 1,
              seasons: [season]
            });
          }
        });
      });
      
      // Convert to array and sort by total home runs
      const sortedPlayers = Array.from(playerMap.values())
        .filter(p => p.id) // Only include players with IDs
        .sort((a, b) => b.totalHR - a.totalHR)
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
 */
export async function getPlayerTrajectory(playerId, seasons = []) {
  return cachedFetch(`trajectory_${playerId}_${seasons.join('_')}`, async () => {
    try {
      // Fetch all seasons in parallel
      const fetchPromises = seasons.map(season =>
        fetch(`${BASE_URL}/people/${playerId}?hydrate=stats(group=hitting,type=season,season=${season},sportId=1)`)
          .then(res => res.json())
          .then(data => {
            if (data.people?.[0]?.stats?.[0]?.splits?.[0]) {
              const split = data.people[0].stats[0].splits[0];
              return {
                year: parseInt(split.season),
                hr: split.stat.homeRuns || 0
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
 */
export async function getHistoricalRecords() {
  return cachedFetch('historical_records', async () => {
    try {
      // Fetch all-time single season home run leaders
      const response = await fetch(
        `${BASE_URL}/stats/leaders?leaderCategories=homeRuns&statType=statsSingleSeason&limit=10&sportId=1`
      );
      const data = await response.json();
    
    if (!data.leagueLeaders?.[0]?.leaders) {
      console.error('No historical leaders data found');
      return [];
    }
    
    const leaders = data.leagueLeaders[0].leaders;
    
    // Map and determine status for each record
    return leaders.map((leader, index) => {
      const year = leader.season ? parseInt(leader.season) : null;
      const hr = parseInt(leader.value);
      const player = leader.person.fullName;
      const teamId = leader.team?.id;
      const team = TEAM_ABBREVIATIONS[teamId] || leader.team?.name?.substring(0, 3).toUpperCase();
      
      // Determine status based on ranking and other criteria
      let status = '';
      if (index === 0) {
        status = 'All-Time Record';
      } else if (player === 'Aaron Judge' && hr === 62) {
        status = 'AL Record';
      } else if (player === 'Roger Maris') {
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
        team,
        teamId,
        hr,
        year,
        status
      };
    });
  } catch (error) {
    console.error('Error fetching historical records:', error);
    // Fallback to hardcoded data if API fails
    return [
      { rank: 1, player: "Barry Bonds", team: "SFG", teamId: 137, hr: 73, year: 2001, status: "All-Time Record" },
      { rank: 2, player: "Mark McGwire", team: "STL", hr: 70, year: 1998, status: "NL Record (Former)" },
      { rank: 3, player: "Sammy Sosa", team: "CHC", hr: 66, year: 1998, status: "Active Era" },
      { rank: 4, player: "Mark McGwire", team: "STL", hr: 65, year: 1999, status: "Active Era" },
      { rank: 5, player: "Sammy Sosa", team: "CHC", hr: 64, year: 2001, status: "Active Era" },
      { rank: 6, player: "Sammy Sosa", team: "CHC", hr: 63, year: 1999, status: "Active Era" },
      { rank: 7, player: "Aaron Judge", team: "NYY", hr: 62, year: 2022, status: "AL Record" },
      { rank: 8, player: "Roger Maris", team: "NYY", hr: 61, year: 1961, status: "AL Record (Former)" },
      { rank: 9, player: "Babe Ruth", team: "NYY", hr: 60, year: 1927, status: "Historical Legend" }
    ];
    }
  }, 24 * 60 * 60 * 1000); // Cache for 24 hours (historical data doesn't change)
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
