import PropTypes from "prop-types";

export function ArticleDetail({ article }) {
  if (!article) {
    return <p>Select a match to see the AI analysis.</p>;
  }

  return (
    <article>
      <h1>{article.title}</h1>
      <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>AI Tactical Breakdown</p>
      <div
        style={{
          marginTop: "1rem",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}
      >
        {article.content}
      </div>
    </article>
  );
}

ArticleDetail.propTypes = {
  article: PropTypes.object,
};
