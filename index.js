const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;
const DATABASE_NAME = 'HomeNest';
const PROPERTY_COLLECTION_NAME = 'Property';

let propertyCollection = null;

app.use(cors());
app.use(express.json());

// Build the Atlas URI from local env values.
const createMongoUri = () => {
  const { DB_USER, DB_PASS } = process.env;
  if (!DB_USER || !DB_PASS) {
    throw new Error('Missing DB_USER or DB_PASS in .env');
  }
  return `mongodb+srv://${DB_USER}:${DB_PASS}@withrifat.xit2u0l.mongodb.net/?retryWrites=true&w=majority&appName=withrifat`;
};

const isValidMongoId = (id) => ObjectId.isValid(id);
const getPropertyQuery = (id) => ({ _id: new ObjectId(id) });

const getUpdateFields = (payload = {}) => {
  const updateFields = {};
  const allowedFields = ['property_title', 'price_range', 'location'];
  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      updateFields[field] = payload[field];
    }
  });
  return updateFields;
};

// Block property routes until MongoDB is ready.------------------------------------------
const ensureDatabaseConnection = (req, res, next) => {
  if (!propertyCollection) {
    return res.status(503).send({
      error: 'Database is not connected yet. Please try again shortly.',
    });
  }
  next();
};

app.get('/', (req, res) => {
  res.send('HomeNest server is running');
});

app.get('/health', (req, res) => {
  res.status(200).send({
    server: 'ok',
    database: propertyCollection ? 'connected' : 'disconnected',
  });
});
// ------------------------------------------------------------------------------------------
// 
// Property routes
app.get('/property', ensureDatabaseConnection, async (req, res, next) => {
  try {
    const result = await propertyCollection.find().toArray();
    res.send(result);
  } catch (error) {
    next(error);
  }
});

app.get('/property/:id', ensureDatabaseConnection, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidMongoId(id)) {
      return res.status(400).send({ error: 'Invalid property ID format' });
    }
    const result = await propertyCollection.findOne(getPropertyQuery(id));
    if (!result) {
      return res.status(404).send({ error: 'Property not found' });
    }
    res.send(result);
  } catch (error) {
    next(error);
  }
});

app.post('/property', ensureDatabaseConnection, async (req, res, next) => {
  try {
    const newProperty = req.body;
    if (!newProperty || Object.keys(newProperty).length === 0) {
      return res.status(400).send({ error: 'Property data is required' });
    }
    const result = await propertyCollection.insertOne(newProperty);
    res.status(201).send(result);
  } catch (error) {
    next(error);
  }
});

app.patch('/property/:id', ensureDatabaseConnection, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidMongoId(id)) {
      return res.status(400).send({ error: 'Invalid property ID format' });
    }
    const updateFields = getUpdateFields(req.body);
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).send({
        error: 'At least one updatable field is required',
      });
    }
    const result = await propertyCollection.updateOne(getPropertyQuery(id), {
      $set: updateFields,
    });
    if (result.matchedCount === 0) {
      return res.status(404).send({ error: 'Property not found' });
    }
    res.send(result);
  } catch (error) {
    next(error);
  }
});

app.delete('/property/:id', ensureDatabaseConnection, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidMongoId(id)) {
      return res.status(400).send({ error: 'Invalid property ID format' });
    }
    const result = await propertyCollection.deleteOne(getPropertyQuery(id));
    if (result.deletedCount === 0) {
      return res.status(404).send({ error: 'Property not found' });
    }
    res.send(result);
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  if (res.headersSent) {
    return next(error);
  }
  res.status(500).send({ error: 'Something went wrong on the server' });
});

// Connect once and keep the collection ready for route handlers.
const connectToDatabase = async () => {
  try {
    const client = new MongoClient(createMongoUri(), {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    propertyCollection = client.db(DATABASE_NAME).collection(PROPERTY_COLLECTION_NAME);
    console.log('Successfully connected to MongoDB!');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
  }
};

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});

connectToDatabase();
