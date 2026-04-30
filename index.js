const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

// mongodb uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@withrifat.xit2u0l.mongodb.net/?retryWrites=true&w=majority&appName=withrifat`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // connection check
    await client.connect();

    const db = client.db('HomeNest');
    const propertyCollection = db.collection('Property');
    const usersCollection = db.collection('Users');
    const reviewsCollection = db.collection('Reviews');

    // users collection api
    app.post('/users', async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        res.send({ message: 'user already exists' });
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });

    app.get('/users', async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete('/users/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await usersCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(400).send({ message: 'Invalid user ID format' });
      }
    });

    // reviews collection api
    app.post('/reviews', async (req, res) => {
      const newReview = req.body;
      const result = await reviewsCollection.insertOne(newReview);
      res.send(result);
    });

    app.get('/reviews', async (req, res) => {
      const email = req.query.email;
      const query = {};

      if (email) {
        query.email = email;
      }

      const cursor = reviewsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete('/reviews/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await reviewsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(400).send({ message: 'Invalid review ID format' });
      }
    });

    // property api start
    app.get('/property', async (req, res) => {
      const email = req.query.email;
      const query = {};

      if (email) {
        query.email = email;
      }

      const cursor = propertyCollection.find(query).sort({ created_at: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/latest-property', async (req, res) => {
      const cursor = propertyCollection.find().sort({ created_at: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/property/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await propertyCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: 'Property not found' });
        }

        res.send(result);
      } catch (error) {
        res.status(400).send({ message: 'Invalid property ID format' });
      }
    });

    app.post('/property', async (req, res) => {
      const newProperty = req.body;
      const result = await propertyCollection.insertOne(newProperty);
      res.send(result);
    });

    app.patch('/property/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updatedProperty = req.body;
        const query = { _id: new ObjectId(id) };
        const update = {
          $set: {
            property_title: updatedProperty.property_title,
            price_range: updatedProperty.price_range,
            location: updatedProperty.location,
            image: updatedProperty.image,
            description: updatedProperty.description,
          },
        };

        const result = await propertyCollection.updateOne(query, update);
        res.send(result);
      } catch (error) {
        res.status(400).send({ message: 'Invalid property ID format' });
      }
    });

    app.delete('/property/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await propertyCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(400).send({ message: 'Invalid property ID format' });
      }
    });
    // end property api

    await client.db('admin').command({ ping: 1 });
    console.log('Successfully connected to MongoDB!');
  } finally {
    // keep connection alive while server is running
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('HomeNest server is running');
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
