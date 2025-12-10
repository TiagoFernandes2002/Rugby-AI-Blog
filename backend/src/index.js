// backend/src/index.js
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
require("dotenv").config();

const { getAll, getById, addArticle } = require("./articlesRepo");
const {
  buildWeeklySummariesForAllLeaguesHistorical,
} = require("./rugbyData");

const {
  generateRoundupArticle,
  generateVlogArticle,
} = require("./aiClient");

const { fetchStandings } = require("./rugbyStandings");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

console.log("[CRON] Scheduler booted at", new Date().toISOString());

// ---------- ROTAS DE ARTIGOS ----------
app.get("/articles", (req, res) => {
  res.json(getAll());
});

app.get("/articles/:id", (req, res) => {
  const id = Number(req.params.id);
  const article = getById(id);
  if (!article) return res.status(404).json({ error: "Article not found" });
  res.json(article);
});

app.get("/", (req, res) => {
  res.json({ status: "ok", source: "Rugby AI backend" });
});

// ---------- CRON 1: weekly round-ups ----------
cron.schedule("00 20 * * 1", async () => {
  console.log("📰 [CRON] Historic weekly round-ups (Monday 20:00)");

  try {
    const summaries = await buildWeeklySummariesForAllLeaguesHistorical(2022);

    for (const summary of summaries) {
      const { leagueKey, leagueName, season, summaryText } = summary;

      const article = await generateRoundupArticle(summaryText);

      const saved = addArticle({
        ...article,
        title: `${leagueName} ${season} – Weekly Round-Up: ${article.title}`,
        type: "roundup",
        league: leagueKey,
        season,
      });

      console.log(
        `✅ Round-up article saved for ${leagueKey}: ${saved.title}`
      );
    }
  } catch (err) {
    console.error("❌ Error in historic weekly round-ups:", err);
  }
});

// ---------- CRON 2: weekly vlog ----------
const VLOG_TOPICS = [
  "How modern rugby kicking strategies create territorial pressure",
  "Why defense systems have changed so much in the last decade",
  "The evolution of number 10: playmaker, kicker and game manager",
  "URC vs Top 14 vs Premiership: different styles of rugby explained",
  "How data and analytics are changing rugby coaching",
  "Key differences between international rugby and club rugby",
  "Pendulum defense systems and how backfield coverage works",
];

function getPreviousVlogArticles() {
  const all = getAll();
  return all.filter((a) => a.type === "vlog");
}

function buildPreviousVlogsSummary(max = 10) {
  const vlogs = getPreviousVlogArticles();
  if (!vlogs.length) return "";
  const recent = vlogs.slice(-max);

  return recent
    .map((a) => {
      const topic = a.topic || "unknown topic";
      return `- Title: "${a.title}" | Topic: ${topic}`;
    })
    .join("\n");
}

function pickNextVlogTopic() {
  const vlogs = getPreviousVlogArticles();
  const usedTopics = new Set(vlogs.map((v) => v.topic).filter(Boolean));
  const unused = VLOG_TOPICS.filter((t) => !usedTopics.has(t));

  const list = unused.length ? unused : VLOG_TOPICS;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

cron.schedule("0 20 * * *", async () => {
  console.log("🎥 [CRON] Everyday vlog-style article (20:00)");

  try {
    const topic = pickNextVlogTopic();
    const previousVlogsSummary = buildPreviousVlogsSummary(10);

    console.log("Chosen vlog topic:", topic);

    const article = await generateVlogArticle(topic, previousVlogsSummary);

    const articleWithMeta = {
      ...article,
      type: "vlog",
      topic,
    };

    const saved = addArticle(articleWithMeta);

    console.log(`✅ Vlog article saved: ${saved.title}`);
  } catch (err) {
    console.error("❌ Error generating vlog article:", err);
  }
});

// ---------- ROTA /standings ----------
app.get("/standings", async (req, res) => {
  try {
    const leagueParam = req.query.league ?? "TOP14"; // pode ser "TOP14" ou "16"
    const season = Number(req.query.season) || 2022;

    const table = await fetchStandings(leagueParam, season);

    res.json({
      league: leagueParam,
      season,
      table,
    });
  } catch (err) {
    console.error("Error fetching standings", err.response?.data || err);
    res.status(500).json({ error: "Failed to fetch standings" });
  }
});

// --------- start server ---------
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
