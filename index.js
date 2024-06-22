const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://match-mingle-7cc0f.web.app"],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rpkd5x3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();

    const usersCollection = client.db("matchMingle").collection("users");
    const biodatasCollection = client.db("matchMingle").collection("biodatas");
    const favoriteBiodataCollection = client
      .db("matchMingle")
      .collection("favoriteBio");
    const paymentsCollection = client.db("matchMingle").collection("payments");
    const successStoryCollection = client
      .db("matchMingle")
      .collection("successStory");

    //creating Token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middlewares:
    const verifyToken = (req, res, next) => {
      // console.log('inside token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // Users API
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user.role === "admin";
      }
      res.send({ admin });
    });

    app.get("/users/premium/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let status = false;
      if (user) {
        status = user.status === "premium";
      }
      res.send({ status });
    });

    app.patch("/users/admin/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/users/premium/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "premium",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Biodata API
    app.get("/biodata", async (req, res) => {
      const { age, bioDataType, permanentDivision } = req.query;
      const filter = {};
      if (age) {
        // Parse the age range and create a filter condition
        const [minAge, maxAge] = age.split("-").map(Number);
        filter.age = { $gte: minAge, $lte: maxAge };
      }
      if (bioDataType) {
        filter.bioDataType = bioDataType;
      }
      if (permanentDivision) {
        filter.permanentDivision = permanentDivision;
      }
      const result = await biodatasCollection.find(filter).toArray();
      res.send(result);
    });

    app.get("/biodata/details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await biodatasCollection.findOne(query);
      res.send(result);
    });

    app.get("/biodata/checkout/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await biodatasCollection.findOne(query);
      res.send(result);
    });

    app.get("/biodata/:bioDataType", async (req, res) => {
      const bioDataType = req.params.bioDataType;
      const query = { bioDataType: bioDataType };
      const result = await biodatasCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/biodata/premium/:status", async (req, res) => {
      const status = req.params.status;
      const sortOrder = req.query.sort || "ascending";
      const sortCriteria = { age: sortOrder === "ascending" ? 1 : -1 };
      const query = { status: status };
      const result = await biodatasCollection
        .find(query)
        .sort(sortCriteria)
        .toArray();
      res.send(result);
    });

    app.patch("/biodata/search/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const { status } = req.body;
        const filter = { email: email };
        const updatedDoc = {
          $set: {
            status: status,
          },
        };
        const result = await biodatasCollection.updateOne(filter, updatedDoc);
        if (result.matchedCount === 0) {
          return res.status(404).send("Biodata not found");
        }
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while updating the biodata.");
      }
    });

    app.get("/biodata/search/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await biodatasCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/favoriteBioData", async (req, res) => {
      const cursor = favoriteBiodataCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/favoriteBioData/:userEmail", async (req, res) => {
      const userEmail = req.params.userEmail;
      const query = { userEmail: userEmail };
      const result = await favoriteBiodataCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/favoriteBioData/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await favoriteBiodataCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/payments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await paymentsCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/biodata/search/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const { status } = req.body;
        const filter = { email: email };
        const updatedDoc = {
          $set: {
            status: status,
          },
        };
        const result = await biodatasCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while updating the biodata.");
      }
    });

    app.patch("/payments/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const { status } = req.body;
        const filter = { email: email };
        const updatedDoc = {
          $set: {
            status: status,
          },
        };

        const result = await paymentsCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while updating the biodata.");
      }
    });

    app.post("/favoriteBioData", async (req, res) => {
      try {
        const favoriteBio = req.body;
        const r = req.query?.email;
        // Generate a new unique ID for the new biodata
        let newId = 1;
        const lastBiodata = await favoriteBiodataCollection.findOne(
          {},
          { sort: { favoriteBioId: -1 } }
        );
        if (lastBiodata && typeof lastBiodata.favoriteBioId === "number") {
          newId = lastBiodata.favoriteBioId + 1;
        }
        // Remove _id field if it exists
        if (favoriteBio.hasOwnProperty("_id")) {
          delete favoriteBio._id;
        }
        // Add the new unique favoriteBioId
        favoriteBio.favoriteBioId = newId;
        // Insert the new document
        const result = await favoriteBiodataCollection.insertOne(favoriteBio);
        res.status(200).send(result);
      } catch (error) {
        console.error("Error occurred while processing the request:", error);
        res.status(500).send("An error occurred while processing the request.");
      }
    });

    app.put("/biodata", async (req, res) => {
      try {
        const biodata = req.body;
        const query = { email: biodata.email };
        let newId = 1;
        const lastBiodata = await biodatasCollection.findOne(
          {},
          { sort: { biodataId: -1 } }
        );
        if (lastBiodata && typeof lastBiodata.biodataId === "number") {
          newId = lastBiodata.biodataId + 1;
        }
        // Set the update document with upsert option
        const updatedDoc = {
          $set: {
            ...biodata,
            createdAt: new Date(),
            status: "verified",
          },
          $setOnInsert: {
            biodataId: newId, // Only set biodataId on insert
          },
        };
        const options = { upsert: true };
        // Update the existing document or insert if it doesn't exist
        const result = await biodatasCollection.updateOne(
          query,
          updatedDoc,
          options
        );
        // Send response with the result
        res.send(result);
      } catch (error) {
        res.status(500).send("An error occurred while processing the request.");
      }
    });

    app.get("/successStory", async (req, res) => {
      const sortOrder = req.query.sort || "ascending";
      const sortCriteria = {
        dateOfMarriage: sortOrder === "ascending" ? 1 : -1,
      };
      const result = await successStoryCollection
        .find()
        .sort(sortCriteria)
        .toArray();
      res.send(result);
    });

    app.put("/successStory", async (req, res) => {
      try {
        const biodata = req.body;
        const query = { email: biodata.email };
        let newId = 1;
        const lastBiodata = await successStoryCollection.findOne(
          {},
          { sort: { biodataId: -1 } }
        );
        if (lastBiodata && typeof lastBiodata.biodataId === "number") {
          newId = lastBiodata.biodataId + 1;
        }
        // Set the update document with upsert option
        const updatedDoc = {
          $set: {
            ...biodata,
            createdAt: new Date(),
            status: "verified",
          },
          $setOnInsert: {
            biodataId: newId, // Only set biodataId on insert
          },
        };
        const options = { upsert: true };
        // Update the existing document or insert if it doesn't exist
        const result = await successStoryCollection.updateOne(
          query,
          updatedDoc,
          options
        );
        // Send response with the result
        res.send(result);
      } catch (error) {
        res.status(500).send("An error occurred while processing the request.");
      }
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.get("/payments/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await paymentsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/payments", async (req, res) => {
      const result = await paymentsCollection.find().toArray();
      res.send(result);
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentsCollection.insertOne(payment);
      res.send(paymentResult);
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Match Mingle server is running");
});

app.listen(port, () => {
  console.log(`Match Mingle is running on port: ${port}`);
});
