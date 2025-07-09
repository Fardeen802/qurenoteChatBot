const { Pinecone} = require('@pinecone-database/pinecone');
const OpenAiUtils = require('../utils/OpenAiUtils');
require('dotenv').config();

class PineconeService {
  constructor() {
    this.client = new Pinecone({
        apiKey : process.env.PINECONE_API_KEY,
        controllerHostUrl : process.env.PINECONE_HOSTED_URL,
    });
    // this.client.init({
    //   apiKey: process.env.PINECONE_API_KEY,
    //   environment: process.env.PINECONE_ENVIRONMENT
    // });
    this.index = this.client.Index(process.env.PINECONE_INDEX_NAME);
    this.openai = OpenAiUtils.getOpenAiInstance();
  }

  // Query the index for top-3 relevant docs
  async query(text) {
    // 1. Embed the query text
    const vector = await this.embed(text);

    // 2. Query Pinecone for nearest neighbors
    const { matches } = await this.index.query({
      topK: 3,
      includeMetadata: true,
      vector
    });

    // 3. Return only the metadata of each match
    console.log("matches in pine cone query -> ", matches);
    return matches.map(m => m.metadata);
  }

  // Example wrapper for embeddings (replace with your embedder)
  async embed(text) {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    });

    // The embedding is in data.data[0].embedding
    console.log("response from embedding -> ", response);
    const embedding = response.data[0].embedding;
    console.log("after fetching embedding -> ", embedding);
    return embedding;
  }
}

module.exports = new PineconeService();
