const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5001;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.c6bnaja.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const foodsCollection = client.db("foodSharingDB").collection("foods");
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //add foods to collection

    app.post("/foods", async (req, res) => {
      try {
        const foods = req.body;
        const result = await foodsCollection.insertOne(foods);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    //get all foods

    app.get("/foods", async (req, res) => {
      try {
        const result = await foodsCollection.find().toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    //get top 6 foods

    app.get("/featuredFood", async (req, res) => {
      try {
        const result = await foodsCollection
          .find()
          .sort({ foodQuantity: -1 })
          .limit(6)
          .toArray();

        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    //get single food

    app.get("/foods/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await foodsCollection.findOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});
