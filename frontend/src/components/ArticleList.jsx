// frontend/src/components/ArticleList.jsx
import PropTypes from "prop-types";

function formatDate(date) {
  if (!date) return "";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function ArticleList({ articles, selectedId, onSelect }) {
  if (!articles.length) {
    return <p className="muted">No articles available yet.</p>;
  }

  return (
    <ul className="article-list" aria-label="Articles">
      {articles.map((article) => (
        <li
          key={article.id}
          className={
            "article-list-item" +
            (article.id === selectedId ? " article-list-item--active" : "")
          }
          onClick={() => onSelect(article)}
        >
          <div className="article-list-title">{article.title}</div>

          <div className="article-list-meta">
            {article.date && (
              <span className="pill pill--date">{formatDate(article.date)}</span>
            )}
            {article.type && (
              <span className="pill pill--type">{article.type}</span>
            )}
            {article.league && (
              <span className="pill pill--league">{article.league}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

ArticleList.propTypes = {
  articles: PropTypes.array.isRequired,
  selectedId: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
};
