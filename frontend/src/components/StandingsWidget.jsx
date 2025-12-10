// frontend/src/components/StandingsWidget.jsx
import React from "react";

export function StandingsWidget({
  activeLeague,
  standings,
  onPrevLeague,
  onNextLeague,
  loading,
  error,
  season = 2022,
  onOpenFull,
}) {
  return (
    <div
      className="sidebar-card standings-card"
      onClick={() => onOpenFull && onOpenFull()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpenFull && onOpenFull();
      }}
    >
      <div className="standings-header">
        <div>
          <h3>{activeLeague.label} – Standings</h3>
          <p className="standings-subtitle">{season} season (snapshot)</p>
        </div>
        <div className="standings-nav">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrevLeague && onPrevLeague();
            }}
            aria-label="Previous league"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNextLeague && onNextLeague();
            }}
            aria-label="Next league"
          >
            ›
          </button>
        </div>
      </div>

      {loading && <div className="standings-loading">Loading standings…</div>}

      {!loading && error && (
        <div className="standings-error">{error}</div>
      )}

      {!loading && !error && (!standings || standings.length === 0) && (
        <div className="standings-empty">No standings data.</div>
      )}

      {!loading && !error && standings && standings.length > 0 && (
        <div
          className="standings-table-wrapper"
          onClick={() => onOpenFull && onOpenFull(activeLeague)}
        >
          <table className="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th className="numeric">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, idx) => (
                <tr
                  key={`${row.team}-${idx}`}
                  onClick={() => onOpenFull && onOpenFull(activeLeague)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{row.position}</td>
                  <td className="team-cell">
                    <span>{row.team}</span>
                  </td>
                  <td className="numeric">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
