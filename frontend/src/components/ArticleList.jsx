import PropTypes from "prop-types";

export function ArticleList({ articles, onSelect }) {
  return (
    <div>
      <h2>Rugby Hot Game of the Week</h2>
      <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>
        AI-powered weekly analysis of the most interesting rugby clashes.
      </p>
      <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem" }}>
        {articles.map((a) => (
          <li
            key={a.id}
            style={{
              marginBottom: "0.75rem",
              borderBottom: "1px solid #ddd",
              paddingBottom: "0.5rem",
            }}
          >
            <button
              onClick={() => onSelect(a.id)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                fontSize: "1rem",
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              {a.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

ArticleList.propTypes = {
  articles: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
};
