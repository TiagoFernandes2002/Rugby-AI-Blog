const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'articles.json');

function readArticles() {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function writeArticles(articles) {
  fs.writeFileSync(filePath, JSON.stringify(articles, null, 2));
}

function getAll() {
  return readArticles();
}

function getById(id) {
  return getAll().find((a) => a.id === id);
}

function addArticle(article) {
  const articles = getAll();
  const newId = articles.length
    ? Math.max(...articles.map((a) => a.id)) + 1
    : 1;

  const newArticle = { id: newId, ...article };
  articles.push(newArticle);
  writeArticles(articles);
  return newArticle;
}

module.exports = { getAll, getById, addArticle };
