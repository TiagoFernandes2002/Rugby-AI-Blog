// backend/src/rugbyData.js
const axios = require("axios");
require("dotenv").config();

const API_RUGBY_KEY = process.env.API_RUGBY_KEY;

if (!API_RUGBY_KEY) {
  console.warn("⚠️ API_RUGBY_KEY não está definido. A API de rugby não vai funcionar.");
}

const api = axios.create({
  baseURL: "https://v1.rugby.api-sports.io",
  headers: {
    "x-apisports-key": API_RUGBY_KEY,
  },
});

// IDs das ligas
const LEAGUE_INFO = {
  TOP14:            { id: 16, season: 2022 },
  PREMIERSHIP:      { id: 13, season: 2022 },
  URC:              { id: 76, season: 2022 },
  SUPER_RUGBY:      { id: 71, season: 2022 },
  SIX_NATIONS:      { id: 51, season: 2022 },
  RUGBY_CHAMPIONSHIP:{ id: 85, season: 2022 },
  CHAMPIONS_CUP: { id: 54, season: 2022 },
  CN_HONRA_PORTUGAL: { id: 31, season: 2022 },
};
/**
 * Cache em memória: `{ "16-2022": [array de jogos] }`
 */
const gamesCache = {};

/**
 * Vai buscar TODOS os jogos de uma liga+season.
 * Não usamos "date" aqui por causa da limitação do plano grátis.
 */
async function fetchAllGamesForLeagueSeason(leagueId, season) {
  const cacheKey = `${leagueId}-${season}`;
  if (gamesCache[cacheKey]) return gamesCache[cacheKey];

  const res = await api.get("/games", {
    params: {
      league: leagueId,
      season,
      // NÃO colocar date/from/to aqui
    },
  });

  const games = res.data?.response || [];
  gamesCache[cacheKey] = games;
  return games;
}

/**
 * Standings da época (será, na prática, a classificação final).
 */
async function fetchStandingsForLeagueSeason(leagueId, season) {
  const res = await api.get("/standings", {
    params: { league: leagueId, season },
  });

  return res.data?.response?.[0]?.league?.standings?.[0] || [];
}

/**
 * Calcula uma "janela histórica" baseado no dia/mês atual,
 * mas num targetYear (ex.: 2022).
 *
 * Ex: hoje 2025-12-09 → from 2022-12-02, to 2022-12-09
 */
function getHistoricalWindow(targetYear = 2022, daysBack = 7) {
  const now = new Date();

  const to = new Date(targetYear, now.getMonth(), now.getDate());
  const from = new Date(to);
  from.setDate(from.getDate() - daysBack);

  return { from, to };
}

/**
 * Filtra jogos desta "semana histórica" dentro do array completo da season.
 */
function filterGamesForHistoricalWeek(allGames, targetYear = 2022, daysBack = 7) {
  const { from, to } = getHistoricalWindow(targetYear, daysBack);

  return allGames.filter((g) => {
    const dateStr = g.date || g.game?.date;
    if (!dateStr) return false;

    const d = new Date(dateStr); // isto já vem com ano 2022/2019/etc.

    return d >= from && d <= to;
  });
}

/**
 * Resumo de UMA liga usando dados históricos:
 * - vai buscar season inteira
 * - filtra jogos desta "semana histórica"
 * - junta standings finais
 * Se não houver jogos na janela → devolve null (liga ignorada essa semana).
 */
async function buildWeeklySummaryForLeagueHistorical(leagueKey, targetYear = 2022) {
  const info = LEAGUE_INFO[leagueKey];
  if (!info) return null;

  const { id: leagueId, season } = info;

  // 1) season inteira
  const allGames = await fetchAllGamesForLeagueSeason(leagueId, season);

  // 2) jogos da "semana histórica"
  const games = filterGamesForHistoricalWeek(allGames, season, 7);

  if (!games.length) {
    console.log(
      `ℹ️ Nenhum jogo na semana histórica para ${leagueKey} (season ${season}), liga ignorada.`
    );
    return null;
  }

  // 3) standings (provavelmente finais)
  const standings = await fetchStandingsForLeagueSeason(leagueId, season);
  const leagueName = games[0]?.league?.name || leagueKey;

  let text = `League: ${leagueName} (${leagueKey})\n`;
  text += `Historic season: ${season}\n`;
  text += `Week simulated around the current calendar date, but using historical data.\n\n`;

  text += `Results in this simulated week:\n`;

  games.sort((a, b) => new Date(a.date) - new Date(b.date));

  for (const g of games) {
    const date = g.date || g.game?.date;
    const shortDate = date ? date.slice(0, 10) : "Unknown date";

    const home = g.teams?.home?.name || "Home Team";
    const away = g.teams?.away?.name || "Away Team";

    const homeScore =
      g.scores?.home ??
      g.scores?.home?.total ??
      g.scores?.full?.home ??
      "?";
    const awayScore =
      g.scores?.away ??
      g.scores?.away?.total ??
      g.scores?.full?.away ??
      "?";

    const status =
      g.status?.short || g.status?.long || g.status || "FT/Played";

    text += `- ${shortDate}: ${home} ${homeScore} - ${awayScore} ${away} (${status})\n`;
  }

  if (standings.length) {
    text += `\nStandings (top 6) for this historic season (likely final table):\n`;
    standings.slice(0, 6).forEach((row) => {
      const team = row.team?.name || "Team";
      const rank = row.rank ?? "?";
      const points = row.points ?? row.points_total ?? "?";
      const played = row.all?.played ?? row.played ?? "?";
      const win = row.all?.win ?? row.won ?? "?";
      const lose = row.all?.lose ?? row.lost ?? "?";

      text += `${rank}. ${team} - ${points} pts (P:${played}, W:${win}, L:${lose})\n`;
    });
  } else {
    text += `\nStandings data not available for this league.\n`;
  }

  text += `\nUse this data to write a weekly round-up for this league, as if it was happening this week, but clearly based on the historic season.\n`;

  return {
    leagueKey,
    leagueName,
    season,
    summaryText: text,
  };
}

/**
 * Gera summaries para TODAS as ligas configuradas, ignorando as que não tenham jogos nessa janela.
 */
async function buildWeeklySummariesForAllLeaguesHistorical(targetYear = 2022) {
  const summaries = [];

  for (const leagueKey of Object.keys(LEAGUE_INFO)) {
    try {
      const summary = await buildWeeklySummaryForLeagueHistorical(
        leagueKey,
        targetYear
      );
      if (summary) summaries.push(summary);
    } catch (err) {
      console.error(
        `Erro ao construir resumo semanal histórico para ${leagueKey}:`,
        err.response?.data || err.message || err
      );
    }
  }

  return summaries;
}

module.exports = {
  LEAGUE_INFO,
  buildWeeklySummaryForLeagueHistorical,
  buildWeeklySummariesForAllLeaguesHistorical,
};