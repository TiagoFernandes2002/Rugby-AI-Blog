import { useEffect, useState } from "react";
import { getStandings } from "../api/standings";

const LEAGUE_ORDER = [
  "TOP14",
  "PREMIERSHIP",
  "URC",
  "SUPER_RUGBY",
  "SIX_NATIONS",
];

const LEAGUE_LABELS = {
  TOP14: "Top 14 (France)",
  PREMIERSHIP: "Premiership Rugby (England)",
  URC: "United Rugby Championship",
  SUPER_RUGBY: "Super Rugby",
  SIX_NATIONS: "Six Nations",
};


export function StandingsCarousel() {
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const league = LEAGUE_ORDER[index];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await getStandings(league);
        if (!cancelled) setData(res);
      } catch (e) {
        console.error("Error loading standings", e);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [league]);

  function next() {
    setIndex((i) => (i + 1) % LEAGUE_ORDER.length);
  }

  function prev() {
    setIndex((i) => (i - 1 + LEAGUE_ORDER.length) % LEAGUE_ORDER.length);
  }

  return (
    <div className="standings-widget">
      <div className="standings-header">
        <button onClick={prev}>&lt;</button>
        <div className="standings-title">
          {LEAGUE_LABELS[league]}{" "}
          {data?.season && <span className="standings-season">{data.season}</span>}
        </div>
        <button onClick={next}>&gt;</button>
      </div>

      {loading && <div className="standings-loading">Loading standings…</div>}

      {!loading && data?.table && (
        <div className="standings-table-wrapper">
          <table className="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>P</th>
                <th>W</th>
                <th>L</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {data.table.map((row) => (
                <tr key={row.position}>
                  <td>{row.position}</td>
                  <td className="standings-team-cell">
                    {row.logo && (
                      <img src={row.logo} alt={row.team} className="standings-logo" />
                    )}
                    {row.team}
                  </td>
                  <td>{row.played}</td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                  <td>{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
