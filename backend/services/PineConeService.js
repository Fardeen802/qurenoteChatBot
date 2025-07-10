require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAiUtils = require('../utils/OpenAiUtils');


class PineconeService {
  constructor() {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is not set in environment variables.');
    }
    if (!process.env.PINECONE_INDEX_NAME) {
      throw new Error('PINECONE_INDEX_NAME is not set in environment variables.');
    }
    this.apiKey = process.env.PINECONE_API_KEY;
    this.indexName = process.env.PINECONE_INDEX_NAME;
    this.client = new Pinecone({ apiKey: this.apiKey });
    this.index = null;
    this.openai = OpenAiUtils.getOpenAiInstance();
    this.initialized = false;
    this.initPromise = this.init();
  }

  async init() {
    try {
      this.index = this.client.Index(this.indexName);
      this.initialized = true;
    } catch (err) {
      console.error('Error initializing Pinecone index:', err);
      throw err;
    }
  }

  async ensureInitialized() {
    if (!this.initialized) await this.initPromise;
  }

  async query(text) {
    await this.ensureInitialized();
    try {
      const vector = await this.embed(text);
      const { matches } = await this.index.query({
        topK: 3,
        includeMetadata: true,
        vector
      });
      console.log('matches in pine cone query -> ', matches);
      return matches.map(m => m.metadata);
    } catch (err) {
      console.error('Error querying Pinecone:', err);
      return [];
    }
  }

  async embed(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });
      console.log('response from embedding -> ', response);
      const embedding = response.data[0].embedding;
      console.log('after fetching embedding -> ', embedding);
      return embedding;
    } catch (err) {
      console.error('Error getting embedding from OpenAI:', err);
      throw err;
    }
  }
}

module.exports = new PineconeService();
