const express = require('express');
const cors = require('cors');

const cron = require('node-cron');
const { generateArticle } = require('./aiClient');
const { getAll, getById, addArticle } = require('./articlesRepo');



const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// GET /articles -> lista todos
app.get('/articles', (req, res) => {
  const articles = getAll();
  res.json(articles);
});

// GET /articles/:id -> artigo específico
app.get('/articles/:id', (req, res) => {
  const id = Number(req.params.id);
  const article = getById(id);

  if (!article) {
    return res.status(404).json({ message: 'Article not found' });
  }

  res.json(article);
});

// Agora: 1 vez por semana, segunda-feira às 09:00
cron.schedule('0 9 * * 1', async () => {
  console.log('Running weekly article generation...');
  try {
    const article = await generateArticle();
    const saved = addArticle(article);
    console.log('New weekly article generated:', saved.title);
  } catch (err) {
    console.error('Error generating weekly article:', err);
  }
});


app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
