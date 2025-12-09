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

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// --- Rotas de artigos (igual ao que já tinhas) ---
app.get("/articles", (req, res) => {
  res.json(getAll());
});

app.get("/articles/:id", (req, res) => {
  const id = Number(req.params.id);
  const article = getById(id);
  if (!article) return res.status(404).json({ error: "Article not found" });
  res.json(article);
});

// (opcional) healthcheck
app.get("/", (req, res) => {
  res.json({ status: "ok", source: "Rugby AI backend" });
});

// ---------- CRON 1: Terça 20h – resumos de jornada históricos ----------
// "0 20 * * 2"  → minuto 0, hora 20, dia da semana 2 (terça-feira)
cron.schedule("0 20 * * 1", async () => {
  console.log("📰 [CRON] Historic weekly round-ups (Monday 20:00)");

  try {
    const summaries = await buildWeeklySummariesForAllLeaguesHistorical(2022);

    for (const summary of summaries) {
      const { leagueKey, leagueName, season, summaryText } = summary;

      const article = await generateRoundupArticle(summaryText);

      // opcional: prefixar o título com liga/season
      article.title = `${leagueName} ${season} – Weekly Round-Up: ${article.title}`;

      const saved = addArticle(article);
      console.log(
        `✅ Round-up article saved for ${leagueKey}: ${saved.title}`
      );
    }
  } catch (err) {
    console.error("❌ Error in historic weekly round-ups:", err);
  }
});

// ---------- CRON 2: Quarta 20h – artigo tipo vlog/opinião ----------

const VLOG_TOPICS = [
  "How modern rugby kicking strategies create territorial pressure",
  "Why defense systems have changed so much in the last decade",
  "The evolution of number 10: playmaker, kicker and game manager",
  "URC vs Top 14 vs Premiership: different styles of rugby explained",
  "How data and analytics are changing rugby coaching",
  "Key differences between international rugby and club rugby",
  "Pendulum defense systems and how backfield coverage works",
];

function pickRandomTopic() {
  const idx = Math.floor(Math.random() * VLOG_TOPICS.length);
  return VLOG_TOPICS[idx];
}

function getPreviousVlogArticles() {
  const all = getAll();
  // Só artigos marcados como vlog (os antigos sem type podem ser ignorados)
  return all.filter((a) => a.type === "vlog");
}

function buildPreviousVlogsSummary(max = 10) {
  const vlogs = getPreviousVlogArticles();

  if (!vlogs.length) return "";

  // pega nos mais recentes
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

  // temas ainda não usados
  const unused = VLOG_TOPICS.filter((t) => !usedTopics.has(t));

  if (unused.length > 0) {
    const idx = Math.floor(Math.random() * unused.length);
    return unused[idx];
  }

  // se já usámos todos, podemos voltar a usar, mas a AI terá o resumo e vai tentar ângulo novo
  const idx = Math.floor(Math.random() * VLOG_TOPICS.length);
  return VLOG_TOPICS[idx];
}


// "0 20 * * 3" → quarta-feira às 20h
cron.schedule("0 20 * * 3", async () => {
  console.log("🎥 [CRON] Weekly vlog-style article (Wednesday 20:00)");

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


// --------- arrancar servidor ---------
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
