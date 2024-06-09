const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("matchMingle").collection("users");
    const biodatasCollection = client.db("matchMingle").collection("biodatas");

    // users api:

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      // if(email !== req.decoded.email){
      //   return res.status(403).send({ message: 'forbidden access'})
      // }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updetedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updetedDoc);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // biodata api:
    app.get("/biodata", async (req, res) => {
      const result = await biodatasCollection.find().toArray();
      res.send(result);
    });

    app.get("/biodata/details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await biodatasCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/biodata/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await biodatasCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/biodata", async (req, res) => {
      const biodata = req.body;
      let newId = 1;
      const lastBiodata = await biodatasCollection.findOne(
        {},
        { sort: { biodataId: -1 } }
      );

      if (lastBiodata && typeof lastBiodata.biodataId === "number") {
        newId = lastBiodata.biodataId + 1;
      }

      const bioDatas = { ...biodata, biodataId: newId, createdAt: new Date() };

      const result = await biodatasCollection.insertOne(bioDatas);
      res.send(result);
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
  res.send("match mingle server is running");
});

app.listen(port, () => {
  console.log(`match mingle is running on the port: ${port}`);
});
