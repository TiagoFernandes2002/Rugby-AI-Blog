// backend/src/aiClient.js
const { hf } = require("./hfClient");

const MODEL_ID = "meta-llama/Llama-3.1-8B-Instruct"; // ajusta se precisares

// 1) Artigo de resumo de jornada (dados históricos)
async function generateRoundupArticle(leagueSummaryText) {
  const systemPrompt = `
You are an expert rugby journalist writing a weekly round-up article.

You receive structured data about one rugby league, based on a historic season:
- results for a simulated "week"
- standings of that season

TASK:
Write an insightful, well-structured article (600–900 words) that:
- summarizes the main results of that week
- highlights key performances and surprising results
- discusses the title race and main contenders based on the standings
- can mention relegation battle if relevant
- makes it clear (subtly) that this is based on a past season, not live results
- has a clear, catchy title
- uses a neutral but enthusiastic tone

The blog is called "Tiago's Rugby Analytics Blog".
Do NOT mention prompts, APIs or that you are an AI.
First line MUST be ONLY the article title. Then a blank line. Then the article body in Markdown.
`;

  const userContent = `
HERE IS THE HISTORIC DATA FOR THIS LEAGUE:

${leagueSummaryText}
`;

  const response = await hf.chatCompletion({
    model: MODEL_ID,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    max_tokens: 900,
  });

  const choice = response.choices && response.choices[0];
  const fullText =
    (choice && choice.message && choice.message.content?.toString()) || "";

  const [firstLine, ...rest] = fullText.split("\n");
  const title =
    firstLine.replace(/^#\s*/, "").trim() || "Weekly Rugby Round-Up (Historic)";
  const content = rest.join("\n").trim() || fullText;

  return { title, content };
}

// 2) Artigo tipo “vlog/opinião”
async function generateVlogArticle(topicHint, previousVlogsSummary = "") {
  const systemPrompt = `
You are a rugby analyst and content creator writing long-form blog/vlog style pieces
for "Tiago's Rugby Analytics Blog".

Style:
- conversational but informed
- mix of tactics, anecdotes and opinion
- aimed at fans who enjoy both rugby and analytics

IMPORTANT:
- You will receive a list of previous vlog topics and titles.
- Avoid repeating the same topic or explaining things in exactly the same way.
- If the new topic is similar to a previous one, take a clearly different angle or focus.

Length: 700–1000 words.
First line MUST be ONLY the article title. Then a blank line. Then the article body in Markdown.
Do NOT mention prompts, APIs or that you are an AI.
`;

  const userContent = `
Here is a summary of previous vlog-style articles (titles and topics):

${previousVlogsSummary || "(no previous vlog articles yet)"}

New vlog theme to write about:

${topicHint}

Please:
- avoid repeating the same structure and explanations from the previous articles;
- bring fresh examples and perspectives;
- you may reference similar ideas, but not copy the same outline or arguments.
`;

  const response = await hf.chatCompletion({
    model: MODEL_ID,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    max_tokens: 1100,
  });

  const choice = response.choices && response.choices[0];
  const fullText =
    (choice && choice.message && choice.message.content?.toString()) || "";

  const [firstLine, ...rest] = fullText.split("\n");
  const title =
    firstLine.replace(/^#\s*/, "").trim() || "Rugby Vlog – Analysis & Thoughts";
  const content = rest.join("\n").trim() || fullText;

  return { title, content };
}

module.exports = {
  generateRoundupArticle,
  generateVlogArticle,
};
