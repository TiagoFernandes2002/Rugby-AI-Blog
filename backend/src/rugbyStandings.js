// backend/src/rugbyStandings.js
const axios = require("axios");

const LEAGUE_IDS = {
  TOP14: 16,
  PREMIERSHIP: 13,
  URC: 76,
  SUPER_RUGBY: 71,
  SIX_NATIONS: 51,
  RUGBY_CHAMPIONSHIP: 85,
  RUGBY_WORLD_CUP: 69,
  CHAMPIONS_CUP: 54,
  CN_HONRA_PORTUGAL: 31,
};

const API_BASE = "https://v1.rugby.api-sports.io";

async function fetchStandings(leagueKeyOrId, season = 2022) {
  // aceita “TOP14” ou “16”
  let leagueId = LEAGUE_IDS[leagueKeyOrId];

  if (!leagueId) {
    const parsed = Number(leagueKeyOrId);
    if (!Number.isNaN(parsed)) {
      leagueId = parsed;
    }
  }

  if (!leagueId) {
    throw new Error(`Unknown league key or id: ${leagueKeyOrId}`);
  }

  const res = await axios.get(`${API_BASE}/standings`, {
    params: { league: leagueId, season },
    headers: {
      "x-apisports-key": process.env.API_RUGBY_KEY,
    },
  });

  const data = res.data;

  // formato “cru” da API-Sports
  if (Array.isArray(data.response) && Array.isArray(data.response[0])) {
    return data.response[0].map((row) => ({
      position: row.position ?? row.rank ?? "?",
      team: row.team?.name ?? "Unknown team",
      logo: row.team?.logo ?? "",
      played: row.games?.played ?? row.all?.played ?? "?",
      wins: row.games?.win?.total ?? row.all?.win ?? "?",
      draws: row.games?.draw?.total ?? row.all?.draw ?? 0,
      losses: row.games?.lose?.total ?? row.all?.lose ?? "?",
      points:
        row.points ??
        row.points_total ??
        row.pointsTotal ??
        row.points_total ??
        "?",
      for: row.goals?.for ?? row.points_for ?? "?",
      against: row.goals?.against ?? row.points_against ?? "?",
      form: row.form ?? "",
    }));
  }

  // se um dia o backend guardar já normalizado
  if (Array.isArray(data.table)) {
    return data.table;
  }

  return [];
}

module.exports = { fetchStandings, LEAGUE_IDS };
