// frontend/src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api/client";
import { getStandingsFromLocal, parseStandingsData } from "./api/standingsLocal";
import { StandingsWidget } from "./components/StandingsWidget";
import FullStandings from "./components/FullStandings";
import "./App.css";

// liga -> tag que usamos nos artigos
const LEAGUE_TAGS = {
  TOP14: "Top 14",
  PREMIERSHIP: "Premiership",
  URC: "URC",
  SUPER_RUGBY: "Super Rugby",
  SIX_NATIONS: "Six Nations",
  RUGBY_CHAMPIONSHIP: "Rugby Championship",
  RUGBY_WORLD_CUP: "Rugby World Cup",
  CHAMPIONS_CUP: "Champions Cup",
  CN_HONRA_PORTUGAL: "CN Honra Portugal",
};

// ligas para o widget de standings (IDs são da API-Sports)
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

function formatDate(dateStr) {
  if (!dateStr) return "No date";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "No date";
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getArticleLeague(article) {
  // return uppercase league key or null when not provided
  if (!article?.league) return null;
  return article.league.toUpperCase();
}

function getArticleTypeTag(article) {
  if (!article?.type) return "OTHER";
  if (article.type === "vlog") return "VLOG";
  if (article.type === "roundup") return "ROUND-UP";
  if (article.type === "intro") return "INTRO";
  return article.type.toUpperCase();
}

function App() {
  // --------- artigos ----------
  const [articles, setArticles] = useState([]);
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [leagueFilter, setLeagueFilter] = useState("ALL");

  // --------- standings ----------
  const [standingsByLeague, setStandingsByLeague] = useState({});
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsError, setStandingsError] = useState("");
  const [standingsLeagueIndex, setStandingsLeagueIndex] = useState(0);
  const [fullStandings, setFullStandings] = useState(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const season = 2022;

  // --------- load artigos ----------
  useEffect(() => {
    async function loadArticles() {
      try {
        const res = await api.get("/articles");
        const list = Array.isArray(res.data) ? res.data : [];
        list.sort((a, b) => {
          const da = new Date(a.date || 0).getTime();
          const db = new Date(b.date || 0).getTime();
          return db - da;
        });
        setArticles(list);
        if (list.length && !selectedArticleId) {
          setSelectedArticleId(list[0].id);
        }
      } catch (err) {
        console.error("Error loading articles", err);
      }
    }
    loadArticles();
  }, [selectedArticleId]);

  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === selectedArticleId) || articles[0],
    [articles, selectedArticleId]
  );

  // --------- load standings (de TODAS as ligas) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadStandings() {
      setStandingsLoading(true);
      setStandingsError("");
      setStandingsByLeague({});

      try {
        const data = {};

        for (const lg of STANDINGS_LEAGUES) {
          try {
            // Try to load from local JSON files
            const payload = await getStandingsFromLocal(lg.id, season);
            console.log("Standings payload for", lg.label, payload);

            let rows = parseStandingsData(payload);
            data[lg.key] = rows;
          } catch (innerErr) {
            console.error(`Error loading standings for ${lg.label}`, innerErr);
            data[lg.key] = [];
          }
        }

        if (!cancelled) {
          setStandingsByLeague(data);
        }
      } catch (err) {
        console.error("Error loading standings", err);
        if (!cancelled) setStandingsError("Failed to load standings.");
      } finally {
        if (!cancelled) setStandingsLoading(false);
      }
    }

    loadStandings();

    return () => {
      cancelled = true;
    };
  }, [season]);

  const activeStandingsLeague = STANDINGS_LEAGUES[standingsLeagueIndex];
  const activeStandingsTable =
    standingsByLeague[activeStandingsLeague.key] || [];

  // helper: find next index with available data (direction: 1 or -1)
  function findNextAvailableIndex(fromIndex, direction) {
    const n = STANDINGS_LEAGUES.length;
    if (!standingsByLeague || Object.keys(standingsByLeague).length === 0) return fromIndex;
    let i = fromIndex;
    for (let k = 0; k < n; k++) {
      i = (i + direction + n) % n;
      const key = STANDINGS_LEAGUES[i].key;
      const rows = standingsByLeague[key];
      if (Array.isArray(rows) && rows.length > 0) return i;
    }
    return fromIndex;
  }

  function handleOpenFullStandings(league) {
    // if no league provided, open current active league
    const idx = typeof league === "number" ? league : standingsLeagueIndex;
    const lg = STANDINGS_LEAGUES[idx];
    const rows = standingsByLeague[lg.key] || [];
    setStandingsLeagueIndex(idx);
    setFullStandings({ leagueIndex: idx, leagueKey: lg.key, label: lg.label, rows });
  }

  function handleCloseFullStandings() {
    setFullStandings(null);
  }

  function handlePrevLeague() {
    const next = findNextAvailableIndex(standingsLeagueIndex, -1);
    setStandingsLeagueIndex(next);
  }

  function handleNextLeague() {
    const next = findNextAvailableIndex(standingsLeagueIndex, 1);
    setStandingsLeagueIndex(next);
  }

  function handlePrevFull() {
    if (!fullStandings) return;
    const next = findNextAvailableIndex(fullStandings.leagueIndex, -1);
    const lg = STANDINGS_LEAGUES[next];
    const rows = standingsByLeague[lg.key] || [];
    setStandingsLeagueIndex(next);
    setFullStandings({ leagueIndex: next, leagueKey: lg.key, label: lg.label, rows });
  }

  function handleNextFull() {
    if (!fullStandings) return;
    const next = findNextAvailableIndex(fullStandings.leagueIndex, 1);
    const lg = STANDINGS_LEAGUES[next];
    const rows = standingsByLeague[lg.key] || [];
    setStandingsLeagueIndex(next);
    setFullStandings({ leagueIndex: next, leagueKey: lg.key, label: lg.label, rows });
  }

  // --------- filters ----------
  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      if (typeFilter !== "ALL" && (a.type || "OTHER") !== typeFilter) {
        return false;
      }
      // normalize article league to a league key using helper
      const articleLeagueKey = getArticleLeague(a);
      if (leagueFilter !== "ALL" && articleLeagueKey !== leagueFilter) {
        return false;
      }
      return true;
    });
  }, [articles, typeFilter, leagueFilter]);

  function handleSelectArticle(id) {
    setSelectedArticleId(id);
    // Close full standings when selecting an article from the list
    if (fullStandings) {
      setFullStandings(null);
    }
  }

  function openMobilePanel() {
    setMobilePanelOpen(true);
  }

  function closeMobilePanel() {
    setMobilePanelOpen(false);
  }

  // --------- render ----------
  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1>Tiago&apos;s Rugby Analytics Blog</h1>
          <p>
            Personal rugby blog powered by automated AI analysis – showing my
            passion for tech and the sport.
          </p>
        </div>
        <div>
          <button
            className="mobile-only icon-button"
            aria-label="Open menu"
            onClick={openMobilePanel}
          >
            <span className="icon-bars" />
          </button>
        </div>
      </header>

      <main className="app-shell">
        {/* LEFT COLUMN */}
        <aside className="sidebar">
          <section className="sidebar-card">
            <div className="sidebar-card-header">
              <h2>Rugby Hot Game of the Week</h2>
              <p>
                AI-powered weekly analysis of the most interesting rugby
                clashes.
              </p>
            </div>

            {/* filtros */}
            <div className="filters-row">
              <div className="select-wrap">
                <select
                  className="filter-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="ALL">All types</option>
                  <option value="intro">Intro</option>
                  <option value="roundup">Round-up</option>
                  <option value="vlog">Vlog / Opinion</option>
                </select>
              </div>

              <div className="select-wrap">
                <select
                  className="filter-select"
                  value={leagueFilter}
                  onChange={(e) => setLeagueFilter(e.target.value)}
                >
                  <option value="ALL">All leagues</option>
                  {
                    // Always offer all known leagues (there may be articles even when standings data is missing)
                    STANDINGS_LEAGUES.map((lg) => (
                      <option key={lg.key} value={lg.key}>{lg.label}</option>
                    ))
                  }
                </select>
              </div>
            </div>

            {/* lista de artigos */}
            <div className="articles-list">
              {filteredArticles.map((article) => {
                const leagueKey = getArticleLeague(article);
                // only compute a label when we have a league key
                // hide generic 'OTHER' values from the UI
                const leagueLabel = leagueKey && leagueKey !== "OTHER"
                  ? (LEAGUE_TAGS[leagueKey] || leagueKey)
                  : null;

                const typeTag = getArticleTypeTag(article);

                return (
                  <button
                    key={article.id}
                    className={
                      "article-list-item" +
                      (article.id === selectedArticle?.id
                        ? " article-list-item-active"
                        : "")
                    }
                    onClick={() => handleSelectArticle(article.id)}
                  >
                    <div className="article-list-title">
                      {article.title || "Untitled article"}
                    </div>
                    <div className="article-list-meta">
                      <span className="tag tag-date">{formatDate(article.date)}</span>

                      {typeTag !== "OTHER" && (
                        <span className={`tag ${
                          typeTag.toLowerCase().includes("vlog")
                            ? "tag-type-vlog"
                            : typeTag.toLowerCase().includes("round")
                            ? "tag-type-roundup"
                            : typeTag.toLowerCase().includes("intro")
                            ? "tag-type-intro"
                            : "tag-default"
                        }`}>{typeTag}</span>
                      )}

                      {leagueLabel && leagueLabel !== "Other" && (
                        <span className="tag tag-league">{leagueLabel}</span>
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredArticles.length === 0 && (
                <div className="empty-state">No articles match this filter.</div>
              )}
            </div>
          </section>

          {/* standings widget */}
          <StandingsWidget
            activeLeague={activeStandingsLeague}
            standings={activeStandingsTable}
            loading={standingsLoading}
            error={standingsError}
            season={season}
            onPrevLeague={handlePrevLeague}
            onNextLeague={handleNextLeague}
            onOpenFull={handleOpenFullStandings}
          />
        </aside>

        {/* Mobile overlay: shown when mobilePanelOpen is true */}
        {mobilePanelOpen && (
          <div className="mobile-overlay" onClick={closeMobilePanel}>
            <div
              className="mobile-panel"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="mobile-panel-header">
                <h2>Menu</h2>
                <button className="icon-button" onClick={closeMobilePanel} aria-label="Close menu">×</button>
              </div>

              <div className="mobile-filters">
                <div style={{ flex: 1 }}>
                  <button
                    className="mobile-standings-link"
                    onClick={() => {
                      // open classification (full standings) for current active league
                      handleOpenFullStandings();
                      closeMobilePanel();
                    }}
                  >
                    Classification
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 6 }}>
                <div className="articles-list">
                  {filteredArticles.map((article) => (
                    <button
                      key={article.id}
                      className={
                        "article-list-item" +
                        (article.id === selectedArticle?.id
                          ? " article-list-item-active"
                          : "")
                      }
                      onClick={() => {
                        handleSelectArticle(article.id);
                        closeMobilePanel();
                      }}
                    >
                      <div className="article-list-title">{article.title}</div>
                      <div className="article-list-meta">
                        <span className="tag tag-date">{formatDate(article.date)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN */}
        <section className="main">
          {fullStandings ? (
            // render full standings view
            <FullStandings
              leagueLabel={fullStandings.label}
              season={season}
              rows={fullStandings.rows}
              onClose={handleCloseFullStandings}
              onPrev={handlePrevFull}
              onNext={handleNextFull}
            />
          ) : selectedArticle ? (
            <article className="article-card">
              <div className="article-meta-row">
                {selectedArticle.league && selectedArticle.league.toLowerCase() !== "other" && (
                  <span className="tag tag-league">
                    {LEAGUE_TAGS[getArticleLeague(selectedArticle)] || selectedArticle.league}
                  </span>
                )}
                {selectedArticle.type && (
                  <span className={`tag ${
                    getArticleTypeTag(selectedArticle).toLowerCase().includes("vlog")
                      ? "tag-type-vlog"
                      : getArticleTypeTag(selectedArticle).toLowerCase().includes("round")
                      ? "tag-type-roundup"
                      : getArticleTypeTag(selectedArticle).toLowerCase().includes("intro")
                      ? "tag-type-intro"
                      : "tag-default"
                  }`}>
                    {getArticleTypeTag(selectedArticle)}
                  </span>
                )}
                <span className="tag tag-date">{formatDate(selectedArticle.date)}</span>
              </div>
              <h2 className="article-title">
                {selectedArticle.title || "Untitled article"}
              </h2>
              <div className="article-content">
                {selectedArticle.content
                  ?.split("\n")
                  .map((p, idx) =>
                    p.trim().length ? (
                      <p key={idx}>{p}</p>
                    ) : (
                      <p key={idx}>&nbsp;</p>
                    )
                  )}
              </div>
            </article>
          ) : (
            <div className="empty-state main-empty">
              No article selected yet.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
