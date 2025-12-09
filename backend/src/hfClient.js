// backend/src/hfClient.js
const { InferenceClient } = require("@huggingface/inference");
require("dotenv").config();

const HF_ACCESS_TOKEN = process.env.HF_ACCESS_TOKEN;

if (!HF_ACCESS_TOKEN) {
  console.warn(
    "⚠️ HF_ACCESS_TOKEN not defined. Generation via Hugging Face will fail."
  );
}

const hf = new InferenceClient(HF_ACCESS_TOKEN);

module.exports = { hf };
