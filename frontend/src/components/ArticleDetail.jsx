// frontend/src/components/ArticleDetail.jsx
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

export function ArticleDetail({ article }) {
  return (
    <article className="card card--article">
      <header className="article-header">
        <div className="article-tags-row">
          {article.league && (
            <span className="pill pill--league">{article.league}</span>
          )}
          {article.type && (
            <span className="pill pill--type">{article.type}</span>
          )}
          {article.date && (
            <span className="pill pill--date">
              {formatDate(article.date)}
            </span>
          )}
        </div>
        <h2 className="article-title">{article.title}</h2>
        {article.subtitle && (
          <p className="article-subtitle">{article.subtitle}</p>
        )}
      </header>

      <section className="article-body">
        {article.content
          ?.split(/\n{2,}/)
          .map((para, idx) => (
            <p key={idx}>{para.trim()}</p>
          ))}
      </section>
    </article>
  );
}

ArticleDetail.propTypes = {
  article: PropTypes.object.isRequired,
};
