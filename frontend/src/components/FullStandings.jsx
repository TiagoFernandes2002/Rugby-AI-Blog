import React from "react";

export function FullStandings({ leagueLabel, season, rows = [], onClose, onPrev, onNext }) {
  return (
    <div className="article-card full-standings">
      <div className="standings-header">
        <div>
          <h3>{leagueLabel} – Full Standings</h3>
          <p className="standings-subtitle">{season} season (snapshot)</p>
        </div>
        <div className="standings-nav">
          <button onClick={(e) => { e.stopPropagation(); onPrev && onPrev(); }} aria-label="Previous league">‹</button>
          <button onClick={(e) => { e.stopPropagation(); onNext && onNext(); }} aria-label="Next league">›</button>
        </div>
      </div>

      <div className="article-meta-row">
        <span className="tag tag-league">{leagueLabel}</span>
        <span className="tag tag-season">SEASON {season}</span>
      </div>

      <div className="standings-full-wrapper">
        <table className="standings-table full">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th className="numeric">P</th>
              <th className="numeric">W</th>
              <th className="numeric">D</th>
              <th className="numeric">L</th>
              <th className="numeric">F</th>
              <th className="numeric">A</th>
              <th className="numeric">Pts</th>
              <th>Form</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${r.team}-${idx}`}>
                <td>{r.position}</td>
                <td className="team-cell">
                  {r.logo ? (
                    <img src={r.logo} alt="" className="team-logo" />
                  ) : null}
                  <span className="team-name">{r.team}</span>
                </td>
                <td className="numeric">{r.played ?? "-"}</td>
                <td className="numeric">{r.wins ?? "-"}</td>
                <td className="numeric">{r.draws ?? "-"}</td>
                <td className="numeric">{r.losses ?? "-"}</td>
                <td className="numeric">{r.for ?? "-"}</td>
                <td className="numeric">{r.against ?? "-"}</td>
                <td className="numeric">{r.points ?? "-"}</td>
                <td>{r.form ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12 }}>
        <button className="icon-button" onClick={onClose} aria-label="Back to articles">←</button>
      </div>
    </div>
  );
}

export default FullStandings;
