const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
// app.use(
//   cors({
//     origin: ["http://localhost:5173"],
//     credentials: true,
//   })
// );
app.use(
  cors({
    origin: ["http://localhost:5173", "https://zero-waste-5fb87.web.app"],
    credentials: true,
  })
);

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

const logger = (req, res, next) => {
  console.log("Log info:", req.method, req.url);
  next();
};

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log("Token in the middleware", token);
  if (!token) {
    return res.status(401).send({ message: "Unauthenticated access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ message: "Unauthenticated access", err: err });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const foodCollection = client.db("foodDB").collection("foods");
    const foodRequestCollection = client.db("foodDB").collection("requests");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "3h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          // secure: true,
          // sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", {
          maxAge: 0,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.get("/searchFood/:name", async (req, res) => {
      const name = req.params.name;
      const result = await foodCollection
        .find({
          $or: [{ Food_Name: { $regex: name, $options: "i" } }],
        })
        .toArray();
      res.send(result);
    });

    app.get("/highestquantity/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    app.get("/highestquantity", async (req, res) => {
      const cursor = foodCollection.find().sort({ Quantity: 1 });

      const result = await cursor.toArray();

      const sortedResult = result.sort((a, b) => {
        const quantityA = parseInt(a.Quantity);
        const quantityB = parseInt(b.Quantity);
        return quantityB - quantityA;
      });

      res.send(sortedResult);
    });

    app.get("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
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

    app.get("/managefoods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    app.get("/managefoods", logger, verifyToken, async (req, res) => {
      let query = {};
      console.log("Token owner info:", req.user);
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      if (req.query?.email) {
        query = { userEmail: req.query.email };
      }
      const result = await foodCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/managefoods/:id", async (req, res) => {
      const id = req.params.id;
      const updatedFood = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const UpdateFood = {
        $set: {
          img: updatedFood.img,
          userEmail: updatedFood.userEmail,
          userName: updatedFood.userName,
          userImage: updatedFood.userImage,
          Food_Name: updatedFood.Food_Name,
          Quantity: updatedFood.Quantity,
          location: updatedFood.location,
          Expired_Date: updatedFood.Expired_Date,
          Additional_Notes: updatedFood.Additional_Notes,
          Status: updatedFood.Status,
        },
      };
      const result = await foodCollection.updateOne(query, UpdateFood, options);
      res.send(result);
    });

    app.delete("/managefoods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/requestfoods", logger, verifyToken, async (req, res) => {
      let query = {};
      console.log("Token owner info:", req.user);
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      if (req.query?.email) {
        query = { loggedInUserEmail: req.query.email };
      }
      const result = await foodRequestCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/requestfoods/:id", async (req, res) => {
      const id = req.params.id;
      const updatedStatus = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const UpdateFood = {
        $set: {
          Status: updatedStatus.Status,
        },
      };
      const result = await foodRequestCollection.updateOne(
        query,
        UpdateFood,
        options
      );
      res.send(result);
    });

    app.get("/req", async (req, res) => {
      const result = await foodRequestCollection.find().toArray();
      res.send(result);
    });

    app.delete("/requestfoods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodRequestCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/requestFood", async (req, res) => {
      const requests = req.body;
      const result = await foodRequestCollection.insertOne(requests);
      res.send(result);
    });

    app.get("/requpdate", async (req, res) => {
      const result = await foodCollection.find().toArray();
      res.send(result);
    });

    app.get("/requpdate/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });
    app.put("/requpdate/:id", async (req, res) => {
      const id = req.params.id;
      const updatedStatus = req.body;
      const query = { _id: new ObjectId(id) };
      const UpdateFood = {
        $set: {
          Status: updatedStatus.Status,
        },
      };
      console.log(UpdateFood);
      const result = await foodCollection.updateOne(query, UpdateFood);
      console.log(result);
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
