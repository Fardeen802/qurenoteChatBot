// mongo.js
const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI;

let cachedDb = null;
let cachedCollection = null;
let mongoClient = null;

async function connectToMongo() {
  if (cachedDb && cachedCollection) {
    return { db: cachedDb, collection: cachedCollection };
  }

  if (!mongoClient) {
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
  }

  cachedDb = mongoClient.db();
  cachedCollection = cachedDb.collection('actiontables');

  return { db: cachedDb, collection: cachedCollection };
}

module.exports = {
  connectToMongo,
};
