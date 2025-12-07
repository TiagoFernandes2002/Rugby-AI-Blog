import { useEffect, useState } from "react";
import { api } from "./api/client";
import { ArticleList } from "./components/ArticleList";
import { ArticleDetail } from "./components/ArticleDetail";

function App() {
  const [articles, setArticles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");

  // Carregar lista de artigos
  useEffect(() => {
    async function fetchArticles() {
      try {
        setLoadingList(true);
        const res = await api.get("/articles");
        setArticles(res.data);
      } catch (err) {
        setError("Failed to load articles.");
        console.error(err);
      } finally {
        setLoadingList(false);
      }
    }

    fetchArticles();
  }, []);

  // Quando o utilizador escolhe um artigo
  const handleSelect = async (id) => {
    try {
      setLoadingDetail(true);
      const res = await api.get(`/articles/${id}`);
      setSelected(res.data);
    } catch (err) {
      setError("Failed to load article.");
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background: "#0b1120",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>
          Tiago&apos;s Rugby Analytics Blog
        </h1>
        <p style={{ opacity: 0.8 }}>
          Personal rugby blog powered by automated AI analysis – showing my
          passion for tech and the sport.
        </p>
      </header>

      {error && (
        <div
          style={{
            background: "#b91c1c",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <main
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "2rem",
        }}
      >
        <section
          style={{
            background: "#020617",
            padding: "1.5rem",
            borderRadius: "0.75rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
          }}
        >
          {loadingList ? (
            <p>Loading matches...</p>
          ) : (
            <ArticleList articles={articles} onSelect={handleSelect} />
          )}
        </section>

        <section
          style={{
            background: "#020617",
            padding: "1.5rem",
            borderRadius: "0.75rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
          }}
        >
          {loadingDetail ? (
            <p>Loading analysis...</p>
          ) : (
            <ArticleDetail article={selected} />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
