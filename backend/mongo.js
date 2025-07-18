// mongo.js
const { MongoClient } = require('mongodb');
require('dotenv').config();


const env=process.env.ENV;
let mongoUri = process.env[`${env}_MONGODB_URI`];

let cachedDb = null;
let cachedCollection = null;
let mongoClient = null;

console.log(mongoUri);

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
