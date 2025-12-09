// frontend/src/components/StandingsWidget.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api/client";

const STANDINGS_LEAGUES = [
  { key: "TOP14", label: "Top 14", id: 16 },
  { key: "PREMIERSHIP", label: "Premiership Rugby", id: 13 },
  { key: "URC", label: "United Rugby Championship", id: 76 },
  { key: "SUPER_RUGBY", label: "Super Rugby", id: 71 },
  { key: "SIX_NATIONS", label: "Six Nations", id: 51 },
  { key: "RUGBY_CHAMPIONSHIP", label: "Rugby Championship", id: 85 },
  { key: "RUGBY_WORLD_CUP", label: "Rugby World Cup", id: 69 },
  { key: "CHAMPIONS_CUP", label: "Champions Cup", id: 54 },
  { key: "CN_HONRA_PORTUGAL", label: "CN Honra Portugal", id: 31 },
];

export function StandingsWidget() {
  const [leagueIndex, setLeagueIndex] = useState(0);
  const [season] = useState(2022);
  const [table, setTable] = useState([]);       // array de linhas
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeLeague = STANDINGS_LEAGUES[leagueIndex];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setTable([]);

      try {
        const res = await api.get("/standings", {
          params: { league: activeLeague.id, season },
        });

        const payload = res.data || {};
        console.log("Standings payload (frontend):", payload);

        let rows = [];

        // 1) formato novo: { league, season, table: [...] }
        if (Array.isArray(payload.table)) {
          rows = payload.table;
        }

        // 2) fallback: formato raw da API-Sports: { response: [[ ... ]] }
        else if (
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

        if (!cancelled) {
          setTable(rows);
        }
      } catch (err) {
        console.error("Error loading standings (frontend):", err);
        if (!cancelled) {
          setError("Failed to load standings.");
          setTable([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [activeLeague.id, season]);

  function goPrev() {
    setLeagueIndex((prev) =>
      prev === 0 ? STANDINGS_LEAGUES.length - 1 : prev - 1
    );
  }

  function goNext() {
    setLeagueIndex((prev) =>
      prev === STANDINGS_LEAGUES.length - 1 ? 0 : prev + 1
    );
  }

  return (
    <div className="sidebar-card standings-card">
      <div className="standings-header">
        <div>
          <h3>{activeLeague.label} – Standings</h3>
          <p className="standings-subtitle">{season} season (snapshot)</p>
        </div>
        <div className="standings-nav">
          <button onClick={goPrev} aria-label="Previous league">
            ‹
          </button>
          <button onClick={goNext} aria-label="Next league">
            ›
          </button>
        </div>
      </div>

      {loading && <div className="standings-loading">Loading standings…</div>}

      {!loading && error && (
        <div className="standings-error">{error}</div>
      )}

      {!loading && !error && table.length === 0 && (
        <div className="standings-empty">No standings data.</div>
      )}

      {!loading && !error && table.length > 0 && (
        <table className="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th className="numeric">Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, idx) => (
              <tr key={`${row.team}-${idx}`}>
                <td>{row.position}</td>
                <td className="team-cell">
                  {row.logo && (
                    <img
                      src={row.logo}
                      alt={row.team}
                      className="team-logo"
                    />
                  )}
                  <span>{row.team}</span>
                </td>
                <td className="numeric">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
