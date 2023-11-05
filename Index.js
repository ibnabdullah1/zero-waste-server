const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rjnekog.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const foodCollection = client.db("foodDB").collection("foods");

    app.get("/highestQuantity", async (req, res) => {
      const cursor = foodCollection.find().sort({ Quantity: 1 });

      const result = await cursor.toArray();

      const sortedResult = result.sort((a, b) => {
        const quantityA = parseInt(a.Quantity);
        const quantityB = parseInt(b.Quantity);
        return quantityB - quantityA;
      });

      res.send(sortedResult);
    });

    app.get("/foods", async (req, res) => {
      let sortDirection = 1;

      if (req.query.Expired_Date === "-1") {
        sortDirection = -1;
      }

      const cursor = foodCollection
        .find()
        .sort({ Expired_Date: sortDirection });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/foods", async (req, res) => {
      const foods = req.body;
      const result = await foodCollection.insertOne(foods);
      res.send(result);
    });

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
  res.send("Zero Waste is running");
});

app.listen(port, () => {
  console.log(`Zero Waste Server is running on port ${port}`);
});
