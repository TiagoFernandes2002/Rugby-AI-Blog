import { api } from "./client";

export async function getStandings(leagueKey) {
  const res = await api.get("/standings", {
    params: { league: leagueKey },
  });
  return res.data; // { league, season, table }
}
