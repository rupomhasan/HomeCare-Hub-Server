const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");

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

    app.get("/", (req, res) => {
      res.send("ServiceHub server is running...");
    });


    

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`ServiceHub_Server is running on port:${port}`);
});
