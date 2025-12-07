// backend/src/aiClient.js

// Mais tarde aqui vais chamar HuggingFace ou OpenAI.
// Por agora, só gera um artigo "fake" para testar o fluxo.

async function generateArticle() {
  const now = new Date();
  const iso = now.toISOString();

  const title = `Auto-generated article - ${iso}`;
  const content = `
This is an automatically generated article created at ${iso}.

In the future, this text will be produced by a real AI model
(HuggingFace / OpenAI). For now, it just helps us test the pipeline.
`;

  return { title, content };
}

module.exports = { generateArticle };
