const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
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

    const biodatasCollection = client.db("matchMingle").collection("biodatas");

    app.get("/biodata", async (req, res) => {
      const result = await biodatasCollection.find().toArray();
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
        console.log(newId);
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
