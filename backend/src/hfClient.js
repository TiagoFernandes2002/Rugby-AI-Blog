// backend/src/hfClient.js
const { InferenceClient } = require("@huggingface/inference");
require("dotenv").config();

const HF_ACCESS_TOKEN = process.env.HF_ACCESS_TOKEN;

if (!HF_ACCESS_TOKEN) {
  console.warn(
    "⚠️ HF_ACCESS_TOKEN não está definido. A geração via Hugging Face vai falhar."
  );
}

const hf = new InferenceClient(HF_ACCESS_TOKEN);

module.exports = { hf };
