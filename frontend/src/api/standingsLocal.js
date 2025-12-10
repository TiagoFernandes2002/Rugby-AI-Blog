// Local JSON standings loader (instead of API to preserve free tier limits)
// Maps standings league IDs to local JSON files

const STANDINGS_FILES = {
  16: "/data/Top14.json", // Top 14
  13: "/data/Premiership.json", // Premiership Rugby
  76: "/data/URC.json", // United Rugby Championship
  71: "/data/Super_Rugby.json", // Super Rugby
  51: "/data/Six_Nations.json", // Six Nations (if available)
  85: "/data/Rugby_Championship.json", // Rugby Championship (if available)
  69: "/data/Rugby_World_Cup.json", // Rugby World Cup (if available)
  54: "/data/Champions_Cup.json", // Champions Cup (if available)
  31: "/data/CN_Honra.json", // CN Honra Portugal
};

/**
 * Load standings from local JSON file instead of API
 * @param {number} leagueId - The league ID (from API-Sports)
 * @param {number} season - The season year
 * @returns {Promise<Object>} The standings data in API-Sports format
 */
export async function getStandingsFromLocal(leagueId, season) {
  const filePath = STANDINGS_FILES[leagueId];

  if (!filePath) {
    throw new Error(`No local standings file found for league ID ${leagueId}`);
  }

  try {
    // Fetch the JSON file from the public directory
    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(
        `Failed to load standings file: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error loading standings from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Parse standings data from API-Sports format
 * @param {Object} payload - The API response payload
 * @returns {Array} Parsed standings rows
 */
export function parseStandingsData(payload) {
  let rows = [];

  // API-Sports format: response[0] contains the standings table
  if (
    Array.isArray(payload.response) &&
    Array.isArray(payload.response[0])
  ) {
    rows = payload.response[0].map((row) => ({
      position: row.position ?? row.rank ?? "?",
      team: row.team?.name ?? "Unknown team",
      logo: row.team?.logo ?? "",
      played: row.games?.played ?? row.all?.played ?? "?",
      wins: row.games?.win?.total ?? row.all?.win ?? "?",
      draws: row.games?.draw?.total ?? row.all?.draw ?? 0,
      losses: row.games?.lose?.total ?? row.all?.lose ?? "?",
      points: row.points ?? row.points_total ?? row.pointsTotal ?? "?",
      for: row.goals?.for ?? row.points_for ?? "?",
      against: row.goals?.against ?? row.points_against ?? "?",
      form: row.form ?? "",
    }));
  }
  // Fallback: simplified format
  else if (Array.isArray(payload.table)) {
    rows = payload.table;
  }

  return rows;
}
