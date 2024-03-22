const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const rules = require("nodemon/lib/rules");

//Use  MiddleWare
app.use(
  cors({
    origin: [""],
    credentials: true,
  })
);
app.use(express.json());

// // URI
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster0.r44bh6t.mongodb.net/?retryWrites=true&w=majority`;

// MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// MongoAll Operation

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });

    // all Collection
    const dataBaseName = client.db("ServiceHub");
    const categoryCollection = dataBaseName.collection("categories");
    const serviceCollection = dataBaseName.collection("services");

    // All Get Operation

    app.get("/", (req, res) => {
      res.send("ServiceHub server is running...");
    });

    app.get("/api/v1/total-services", async (req, res) => {
      try {
        const result = await serviceCollection.countDocuments({});
        res.send({ result });
      } catch (err) {
        console.log(err);
      }
    });

    // done : http://localhost:5000/api/v1/services?category=Gardening
    // done : http://localhost:5000/api/v1/services?service_name=tree_surgeon
    // done : http://localhost:5000/api/v1/services?page=1&limit=10
    app.get("/api/v1/services", async (req, res) => {
      try {
        const queryObj = {};
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const skip = (page - 1) * limit;
        let serviceName = req.query.service_name;
        const category = req.query.category;

        if (serviceName) {
          const regex = new RegExp(
            serviceName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"),
            "i"
          );
          queryObj.Service_Name = regex;
        }

        if (category) {
          queryObj.Category = category;
        }
        const result = await serviceCollection
          .find(queryObj)
          .skip(skip)
          .limit(limit)
          .toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send({ status: 500, message: "Internal server Error" });
      }
    });
    app.get("/api/v1/service/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await serviceCollection.findOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send({ status: 500, message: "Internal server error" });
      }
    });

    app.get("/api/v1/categories", async (req, res) => {
      try {
        const result = await categoryCollection.find().toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send({ status: 500, message: "Internal server error" });
      }
    });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // All the post operation

    app.post("/api/v1/service", async (req, res) => {
      try {
        const data = req.body;
        const result = await serviceCollection.insertOne(data);
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send({ status: 500, message: "Internal server error" });
      }
    });

    // all delete operation

    app.delete("/api/v1/service/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await serviceCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send({ status: 500, message: "Internal server error" });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`ServiceHub Server is running on port:${port}`);
});
