const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
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
    await client.connect();

    const usersCollection = client.db("matchMingle").collection("users");
    const biodatasCollection = client.db("matchMingle").collection("biodatas");

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

    app.patch("/users/admin/:id", async (req, res) => {
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
      console.log(req.query);
      const filter = {};

      // if (age) {
      //   // Using regex to find age range in string format.
      //   filter.age = { $regex: new RegExp(age, "i") };
      // }

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
      console.log("Constructed filter:", filter);

      const result = await biodatasCollection.find(filter).toArray();
      console.log(result);
      res.send(result);
    });

    app.get("/biodata/details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await biodatasCollection.findOne(query);
      res.send(result);
    });

    app.get("/biodata/premium/:status", async (req, res) => {
      const status = req.params.status;
      const query = { status: status };
      const result = await biodatasCollection.find(query).toArray();
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

    // app.post("/biodata", async (req, res) => {
    //   const biodata = req.body;
    //   let newId = 1;
    //   const lastBiodata = await biodatasCollection.findOne(
    //     {},
    //     { sort: { biodataId: -1 } }
    //   );

    //   if (lastBiodata && typeof lastBiodata.biodataId === "number") {
    //     newId = lastBiodata.biodataId + 1;
    //   }

    //   const bioDatas = { ...biodata, biodataId: newId, createdAt: new Date() };

    //   const result = await biodatasCollection.insertOne(bioDatas);
    //   res.send(result);
    // });

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

    app.put("/biodata", async (req, res) => {
      try {
        const biodata = req.body;

        const query = { email: biodata.email }; // Define query to find by email

        // const isExist = await biodatasCollection.findOne(query);
        // if(isExist){
        //   if(biodata.status === "Requested"){
        //     const result = await biodata.updateOne(query, {
        //       $set: {status: biodata.status}
        //     })
        //     return res.send(result)
        //   }
        // }else{
        //   return res.send(isExist)
        // }

        // Determine new biodataId if not existing
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
  res.send("Match Mingle server is running");
});

app.listen(port, () => {
  console.log(`Match Mingle is running on port: ${port}`);
});
