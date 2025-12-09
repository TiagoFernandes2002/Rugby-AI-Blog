// exemplo aproximado
const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "articles.json");

let articles = [];
try {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  articles = JSON.parse(raw);
} catch (e) {
  articles = [];
}

function saveAll() {
  fs.writeFileSync(DATA_PATH, JSON.stringify(articles, null, 2), "utf-8");
}

function getAll() {

  return articles
    .map((a) => ({
      ...a,
      date: a.date || a.createdAt || new Date().toISOString(),
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getById(id) {
  return getAll().find((a) => a.id === id);
}

function addArticle(partialArticle) {
  const now = new Date().toISOString();

  const article = {
    id: articles.length ? Math.max(...articles.map((a) => a.id)) + 1 : 1,
    title: partialArticle.title,
    content: partialArticle.content,

    type: partialArticle.type || "generic",          // 'roundup' | 'vlog' | ...
    league: partialArticle.league || null,          // 'TOP14' etc.
    season: partialArticle.season || null,
    createdAt: now,
    date: partialArticle.date || now,
  };

  articles.push(article);
  saveAll();
  return article;
}

module.exports = {
  getAll,
  getById,
  addArticle,
};
