const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5001;

//middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

//verify middleware

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

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

const requestedFoodsCollection = client
  .db("foodRequestDB")
  .collection("requestedFood");
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //authentication related

    app.post("/jwt", async (req, res) => {
      try {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "1h",
        });
        res
          .cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
          })
          .send({ success: true });
      } catch (err) {
        console.log(err);
      }
    });

    app.post("/logout", async (req, res) => {
      try {
        const user = req.body;
        res.clearCookie("token", { maxAge: 0 }).send({ success: true });
      } catch (err) {
        console.log(err);
      }
    });

    //database related

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

    //get foods by specific user

    app.get("/manage/:email", async (req, res) => {
      try {
        const userEmail = req.params.email;

        const query = { email: userEmail };
        const result = await foodsCollection.find(query).toArray();

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

    //sort food
    app.get("/foods/sort", async (req, res) => {
      try {
        const sortQuery = req.query.sortBy;
        console.log(sortQuery);
        let query = {};
        if (sortQuery.toLowerCase() == "foodName".toLowerCase()) {
          query = { foodName: 1 };
        } else if (sortQuery.toLowerCase() == "expiredDateTime".toLowerCase()) {
          query = { expiredDateTime: 1 };
        }
        console.log(sortQuery);
        const result = await foodsCollection.find().sort(query).toArray();
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

    app.get("/foods/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await foodsCollection.findOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    //update food

    app.patch("/foods/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateFoodData = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            ...updateFoodData,
          },
        };
        const result = await foodsCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });
    //delete food

    app.delete("/foods/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await foodsCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    //add requested food to DB
    requestedFoodsCollection.createIndex(
      { foodId: 1, requesterEmail: 1 },
      { unique: true }
    );

    app.post("/requestedFood", verifyToken, async (req, res) => {
      try {
        const requestedFood = req.body;
        const result = await requestedFoodsCollection.insertOne(requestedFood);
        res.send(result);
      } catch (err) {
        if (err.code === 11000) {
          // Handle duplicate key error (user already requested the same food item)
          res.send("User has already requested this food item.");
        } else {
          // Handle other errors
          console.error(err);
        }
      }
    });

    //get requested food by email

    app.get("/requestedFoods/:email", verifyToken, async (req, res) => {
      try {
        const userEmail = req.params.email;
        const query = { requesterEmail: userEmail };
        const result = await requestedFoodsCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    //get requested food by id

    app.get("/requestedFood/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { foodId: id };
        const result = await requestedFoodsCollection.findOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    // cancel requested food

    app.delete("/requestedFood/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await requestedFoodsCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    //update status

    app.patch("/requestedFoodItem/:foodId", async (req, res) => {
      try {
        const id = req.params.foodId;
        const updateStatus = req.body;

        const query = { foodId: id };
        const updateDoc = {
          $set: {
            status: updateStatus.status,
          },
        };

        const result = await requestedFoodsCollection.updateOne(
          query,
          updateDoc
        );
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
