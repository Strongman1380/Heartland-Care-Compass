import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'heartland_compass';

let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }

  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection('residents');

    switch (req.method) {
      case 'GET':
        const residents = await collection.find({}).toArray();
        res.status(200).json(residents);
        break;

      case 'POST':
        const newResident = {
          ...req.body,
          created_at: new Date(),
          updated_at: new Date()
        };
        const insertResult = await collection.insertOne(newResident);
        const createdResident = await collection.findOne({ _id: insertResult.insertedId });
        res.status(201).json(createdResident);
        break;

      case 'PUT':
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: 'Resident ID is required' });
        }

        const updateData = {
          ...req.body,
          updated_at: new Date()
        };
        delete updateData._id; // Remove _id from update data

        const updateResult = await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (updateResult.matchedCount === 0) {
          return res.status(404).json({ error: 'Resident not found' });
        }

        const updatedResident = await collection.findOne({ _id: new ObjectId(id) });
        res.status(200).json(updatedResident);
        break;

      case 'DELETE':
        const { id: deleteId } = req.query;
        if (!deleteId) {
          return res.status(400).json({ error: 'Resident ID is required' });
        }

        const deleteResult = await collection.deleteOne({ _id: new ObjectId(deleteId) });
        
        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ error: 'Resident not found' });
        }

        res.status(200).json({ message: 'Resident deleted successfully' });
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}