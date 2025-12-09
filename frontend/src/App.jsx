import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { api } from "./api/client";

// ---- Configuração de tipos e ligas ----

const ARTICLE_TYPES = [
  { value: "all", label: "All types" },
  { value: "intro", label: "Intro" },
  { value: "vlog", label: "Vlog" },
  { value: "roundup", label: "Weekly round-up" },
];

// Liga key -> label e id da API de standings
const LEAGUES = [
  { value: "all", label: "All leagues" },
  { value: "TOP14", label: "Top 14", standingsLeagueId: 16 },
  { value: "PREMIERSHIP", label: "Premiership Rugby", standingsLeagueId: 13 },
  { value: "URC", label: "URC", standingsLeagueId: 76 },
  { value: "SUPER_RUGBY", label: "Super Rugby", standingsLeagueId: 71 },
  { value: "SIX_NATIONS", label: "Six Nations", standingsLeagueId: 51 },
  { value: "RUGBY_CHAMPIONSHIP", label: "Rugby Championship", standingsLeagueId: 85 },
  { value: "RUGBY_WORLD_CUP", label: "Rugby World Cup", standingsLeagueId: 69 },
];

// Só as ligas que queremos percorrer no widget de standings
const STANDINGS_LEAGUES = LEAGUES.filter(
  (l) => l.value !== "all" && l.standingsLeagueId
);

// ---- Helpers ----

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB");
}

function getLeagueLabelFromArticle(article) {
  const key = (article.leagueKey || article.league || "").toUpperCase();
  const found = LEAGUES.find((l) => l.value === key);
  return found?.label ?? null;
}

function getTypeLabel(type) {
  switch ((type || "").toLowerCase()) {
    case "intro":
      return "Intro";
    case "vlog":
      return "Vlog";
    case "roundup":
      return "Weekly round-up";
    default:
      return "Article";
  }
}

// ---- Componentes pequenos (tags / linha da lista) ----

function Tag({ children, kind = "default" }) {
  return <span className={`tag tag-${kind}`}>{children}</span>;
}

function ArticleListItem({ article, isActive, onClick }) {
  const date = formatDate(article.createdAt);
  const league = getLeagueLabelFromArticle(article);
  const typeLabel = getTypeLabel(article.type);

  return (
    <button
      type="button"
      className={`article-list-item ${isActive ? "article-list-item-active" : ""}`}
      onClick={onClick}
    >
      <div className="article-list-item-title">{article.title}</div>
      <div className="article-list-item-meta">
        {date && <Tag kind="date">{date}</Tag>}
        {article.type && (
          <Tag kind={`type-${(article.type || "").toLowerCase()}`}>{typeLabel}</Tag>
        )}
        {league && <Tag kind="league">{league}</Tag>}
      </div>
    </button>
  );
}

// ---- Standings (widget + página completa) ----

function StandingsWidget({
  currentLeagueIndex,
  onPrevLeague,
  onNextLeague,
  data,
  loading,
  error,
  onOpenFullStandings,
}) {
  const league = STANDINGS_LEAGUES[currentLeagueIndex];

  return (
    <div
      className="standings-card"
      onClick={onOpenFullStandings}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpenFullStandings()}
    >
      <div className="standings-header">
        <div>
          <h3 className="standings-title">{league.label} – Standings</h3>
          <p className="standings-subtitle">2022 season (snapshot)</p>
        </div>
        <div className="standings-nav">
          <button
            type="button"
            className="icon-button"
            onClick={(e) => {
              e.stopPropagation();
              onPrevLeague();
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={(e) => {
              e.stopPropagation();
              onNextLeague();
            }}
          >
            ›
          </button>
        </div>
      </div>

      <div className="standings-table-wrapper compact">
        {loading && <div className="standings-placeholder">Loading standings…</div>}
        {error && <div className="standings-error">{error}</div>}
        {!loading && !error && data && data.length > 0 && (
          <table className="standings-table compact">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 8).map((row) => (
                <tr key={row.team.id ?? row.team.name}>
                  <td>{row.position}</td>
                  <td>{row.team.name}</td>
                  <td>{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !error && (!data || data.length === 0) && (
          <div className="standings-placeholder">No standings data.</div>
        )}
      </div>
    </div>
  );
}

function StandingsFullPage({ leagueIndex, data, loading, error, onBack }) {
  const league = STANDINGS_LEAGUES[leagueIndex];

  return (
    <div className="article-card article-card-standings">
      <div className="article-card-header">
        <div className="article-tags">
          <Tag kind="league">{league.label}</Tag>
          <Tag kind="date">Season 2022</Tag>
        </div>
        <h1 className="article-title">{league.label} – Full Standings</h1>
      </div>

      <button type="button" className="back-link" onClick={onBack}>
        ← Back to articles
      </button>

      <div className="standings-table-wrapper">
        {loading && <div className="standings-placeholder">Loading standings…</div>}
        {error && <div className="standings-error">{error}</div>}
        {!loading && !error && data && data.length > 0 && (
          <table className="standings-table full">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>Played</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>Pts</th>
                <th>For</th>
                <th>Against</th>
                <th>Form</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.team.id ?? row.team.name}>
                  <td>{row.position}</td>
                  <td>{row.team.name}</td>
                  <td>{row.games.played}</td>
                  <td>{row.games.win.total}</td>
                  <td>{row.games.draw.total}</td>
                  <td>{row.games.lose.total}</td>
                  <td>{row.points}</td>
                  <td>{row.goals.for}</td>
                  <td>{row.goals.against}</td>
                  <td>{row.form}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !error && (!data || data.length === 0) && (
          <div className="standings-placeholder">No standings data.</div>
        )}
      </div>
    </div>
  );
}

// ---- App principal ----

export default function App() {
  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [articlesError, setArticlesError] = useState("");

  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [leagueFilter, setLeagueFilter] = useState("all");

  // page: "article" | "standings"
  const [page, setPage] = useState("article");

  // mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // standings
  const [standingsLeagueIndex, setStandingsLeagueIndex] = useState(0);
  const [standingsData, setStandingsData] = useState(null);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [standingsError, setStandingsError] = useState("");

  // ---- Carregar artigos ----
  useEffect(() => {
    async function loadArticles() {
      try {
        setLoadingArticles(true);
        setArticlesError("");
        const res = await api.get("/articles");
        setArticles(res.data || []);
      } catch (err) {
        console.error(err);
        setArticlesError("Failed to load articles.");
      } finally {
        setLoadingArticles(false);
      }
    }

    loadArticles();
  }, []);

  // garantir artigo selecionado
  useEffect(() => {
    if (!articles.length) return;
    if (!selectedArticleId) {
      setSelectedArticleId(articles[0].id);
    }
  }, [articles, selectedArticleId]);

  // ---- Standings ----
  async function fetchStandingsForIndex(index) {
    const league = STANDINGS_LEAGUES[index];
    if (!league) return;

    try {
      setLoadingStandings(true);
      setStandingsError("");
      setStandingsData(null);

      const res = await api.get("/standings", {
        params: { league: league.standingsLeagueId },
      });

      // backend deve devolver { response: [[...]] } ou directamente array
      let rows = [];

      if (Array.isArray(res.data)) {
        rows = res.data;
      } else if (Array.isArray(res.data?.response)) {
        const firstLevel = res.data.response[0];
        rows = Array.isArray(firstLevel) ? firstLevel : res.data.response;
      }

      setStandingsData(rows || []);
    } catch (err) {
      console.error(err);
      setStandingsError("Failed to load standings.");
    } finally {
      setLoadingStandings(false);
    }
  }

  useEffect(() => {
    fetchStandingsForIndex(standingsLeagueIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standingsLeagueIndex]);

  const handlePrevLeague = () => {
    setStandingsLeagueIndex((prev) =>
      prev === 0 ? STANDINGS_LEAGUES.length - 1 : prev - 1
    );
  };

  const handleNextLeague = () => {
    setStandingsLeagueIndex((prev) =>
      prev === STANDINGS_LEAGUES.length - 1 ? 0 : prev + 1
    );
  };

  // ---- Filtros ----
  const filteredArticles = useMemo(() => {
    let result = [...articles];

    if (typeFilter !== "all") {
      result = result.filter(
        (a) => (a.type || "").toLowerCase() === typeFilter
      );
    }

    if (leagueFilter !== "all") {
      result = result.filter(
        (a) =>
          (a.leagueKey || a.league || "").toUpperCase() === leagueFilter
      );
    }

    // ordenar por data desc, se existir
    result.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );

    return result;
  }, [articles, typeFilter, leagueFilter]);

  const selectedArticle =
    filteredArticles.find((a) => a.id === selectedArticleId) ||
    filteredArticles[0] ||
    null;

  // se mudarem filtros e o artigo selecionado sair da lista
  useEffect(() => {
    if (!selectedArticle && filteredArticles.length > 0) {
      setSelectedArticleId(filteredArticles[0].id);
    }
  }, [filteredArticles, selectedArticle]);

  const handleSelectArticle = (articleId) => {
    setPage("article");
    setSelectedArticleId(articleId);
    setMobileMenuOpen(false);
  };

  // ---- Render ----

  const isMobile = window.innerWidth <= 900; // simples, suficiente aqui

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1 className="app-title">Tiago&apos;s Rugby Analytics Blog</h1>
          <p className="app-subtitle">
            Personal rugby blog powered by automated AI analysis – showing my
            passion for tech and the sport.
          </p>
        </div>

        {/* Botão hamburger (só em mobile) */}
        <button
          type="button"
          className="icon-button mobile-only"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="icon-bars" />
        </button>
      </header>

      <main className="app-main">
        {/* Sidebar desktop */}
        <aside className="sidebar hide-on-mobile">
          <div className="sidebar-card">
            <h2 className="sidebar-title">Rugby Hot Game of the Week</h2>
            <p className="sidebar-subtitle">
              AI-powered weekly analysis of the most interesting rugby clashes.
            </p>

            <div className="filters-row">
              <select
                className="filter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {ARTICLE_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={leagueFilter}
                onChange={(e) => setLeagueFilter(e.target.value)}
              >
                {LEAGUES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="article-list">
              {loadingArticles && (
                <div className="article-list-placeholder">Loading articles…</div>
              )}
              {articlesError && (
                <div className="article-list-error">{articlesError}</div>
              )}
              {!loadingArticles &&
                !articlesError &&
                filteredArticles.map((article) => (
                  <ArticleListItem
                    key={article.id}
                    article={article}
                    isActive={selectedArticleId === article.id}
                    onClick={() => handleSelectArticle(article.id)}
                  />
                ))}
              {!loadingArticles &&
                !articlesError &&
                filteredArticles.length === 0 && (
                  <div className="article-list-placeholder">
                    No articles found for this filter.
                  </div>
                )}
            </div>
          </div>

          <StandingsWidget
            currentLeagueIndex={standingsLeagueIndex}
            onPrevLeague={handlePrevLeague}
            onNextLeague={handleNextLeague}
            data={standingsData}
            loading={loadingStandings}
            error={standingsError}
            onOpenFullStandings={() => setPage("standings")}
          />
        </aside>

        {/* Área principal à direita */}
        <section className="article-section">
          {page === "article" && selectedArticle && (
            <article className="article-card">
              <div className="article-card-header">
                <div className="article-tags">
                  {selectedArticle.type && (
                    <Tag
                      kind={`type-${(selectedArticle.type || "").toLowerCase()}`}
                    >
                      {getTypeLabel(selectedArticle.type)}
                    </Tag>
                  )}
                  {getLeagueLabelFromArticle(selectedArticle) && (
                    <Tag kind="league">
                      {getLeagueLabelFromArticle(selectedArticle)}
                    </Tag>
                  )}
                  {selectedArticle.createdAt && (
                    <Tag kind="date">
                      {formatDate(selectedArticle.createdAt)}
                    </Tag>
                  )}
                </div>
                <h1 className="article-title">{selectedArticle.title}</h1>
              </div>
              <div className="article-content">
                <p>{selectedArticle.content}</p>
              </div>
            </article>
          )}

          {page === "standings" && (
            <StandingsFullPage
              leagueIndex={standingsLeagueIndex}
              data={standingsData}
              loading={loadingStandings}
              error={standingsError}
              onBack={() => setPage("article")}
            />
          )}

          {!selectedArticle && page === "article" && (
            <div className="article-card">
              <h2 className="article-title">No articles yet</h2>
              <p className="article-content">
                As soon as the AI generates some posts, they will appear here.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Menu mobile (overlay) */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="mobile-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-panel-header">
              <h2>Articles</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setMobileMenuOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="mobile-filters">
              <select
                className="filter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {ARTICLE_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={leagueFilter}
                onChange={(e) => setLeagueFilter(e.target.value)}
              >
                {LEAGUES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="article-list mobile">
              {filteredArticles.map((article) => (
                <ArticleListItem
                  key={article.id}
                  article={article}
                  isActive={selectedArticleId === article.id}
                  onClick={() => handleSelectArticle(article.id)}
                />
              ))}
            </div>

            <button
              type="button"
              className="mobile-standings-link"
              onClick={() => {
                setPage("standings");
                setMobileMenuOpen(false);
              }}
            >
              View standings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
