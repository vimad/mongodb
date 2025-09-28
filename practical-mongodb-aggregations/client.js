import { MongoClient } from 'mongodb'

// Connection URL
const url = 'mongodb://root:123@localhost:27017/aggregation-test?authSource=admin&replicaSet=rs0';
const client = new MongoClient(url);

// Database Name
export const dbName = 'aggregation-test';

await client.connect();
export const db = client.db(dbName);
export const adminDb = client.db("admin");