const OpenAI = require("openai");
require('dotenv').config();

class OpenAiUtils {
  static getOpenAiInstance() {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_KEY,
    });
    return openai;
  }
}

module.exports = OpenAiUtils;