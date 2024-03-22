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
    const bookingCollection = dataBaseName.collection("bookings");
    const choseUsCollection = dataBaseName.collection("choseUs");
    const reviewCollection = dataBaseName.collection("review");
    const usersCollection = dataBaseName.collection("users");

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
    // done : http://localhost:5000/api/v1/services?minPrice=6000&maxPrice=7000
    app.get("/api/v1/services", async (req, res) => {
      try {
        const queryObj = {};
        const minPrice = parseFloat(req.query.minPrice);
        const maxPrice = parseFloat(req.query.maxPrice);
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const skip = (page - 1) * limit;
        let serviceName = req.query.service_name;
        const category = req.query.category;

        if (minPrice && maxPrice) {
          queryObj.Service_Price = { $gte: minPrice, $lte: maxPrice };
        }

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

    app.get("/api/v1/user/bookings", async (req, res) => {
      try {
        const queryObj = {};
        const email = req.query.email;

        if (email) {
          queryObj["customer.email"] = email;
        }
        const result = await bookingCollection.find(queryObj).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ status: 500, message: "Internal Server Error" });
      }
    });
    app.get("/api/v1/user/review", async (req, res) => {
      try {
        const result = await reviewCollection.find().toArray();
        res.send(result);
      } catch (err) {
        res.send({ status: 500, message: "Internal server error" });
      }
    });
    app.get("/api/v1/users", async (req, res) => {
      try {
        let queryObj = {};
        const email = req.query.email;
        if (email) {
          queryObj.email = email;
        }
        const result = await usersCollection.find(queryObj).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ status: 500, message: "Internal Server Error" });
      }
    });

    app.get("/api/v1/choseUs", async (req, res) => {
      try {
        const result = await choseUsCollection.find().toArray();
        res.send(result);
      } catch (err) {
        res.send({ status: 500, message: "Internal Server Error" });
      }
    });
    // All the post operation

    app.post("/api/v1/create-service", async (req, res) => {
      try {
        const data = req.body;
        const result = await serviceCollection.insertOne(data);
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send({ status: 500, message: "Internal server error" });
      }
    });
    app.post("/api/v1/user/create-booking", async (req, res) => {
      try {
        const data = req.body;
        const result = await bookingCollection.insertOne(data);
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send({ status: 500, message: "Internal server error" });
      }
    });
    app.post("/api/v1/user/give-review", async (req, res) => {
      try {
        const review = req.body;
        const result = await reviewCollection.insertOne(review);
        res.send(result);
      } catch (err) {
        res.status(500).send({ status: 500, message: "Internal Server Error" });
      }
    });
    app.post("/api/v1/create-user", async (req, res) => {
      try {
        const review = req.body;
        const result = await usersCollection.insertOne(review);
        res.send(result);
      } catch (err) {
        res.status(500).send({ status: 500, message: "Internal Server Error" });
      }
    });
    //all update operation

    app.patch("/api/v1/update-user", async (req, res) => {
      try {
        const email = req.query.email;
        const queryObj = { email: email };
        const user = req.body;
        const updatedUser = {
          $set: {
            username: user?.username,
            email: user?.email,
            password: user?.password,
            fullName: user?.fullName,
            age: user?.age,
            address: user?.address,
            phoneNumber: user?.phoneNumber,
          },
        };
        const result = await usersCollection.updateOne(queryObj, updatedUser);
        res.send(result);
      } catch (err) {
        res.status(500).send({ status: 500, message: "Internal server error" });
      }
    });

    app.patch("/api/v1/update-service/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const service = req.body;
        const updatedService = {
          $set: {
            Service_Image: service?.Service_Image,
            Service_Name: service?.Service_Name,
            Service_Description: service?.Service_Description,
            Service_Price: service?.Service_Price,
            Category: service?.Category,
            Rating: service?.Rating,
            Total_Purchase: service?.Total_Purchase,
            Service_Provider: {
              Email: service.Service_Provider.Email,
              Logo: service.Service_Provider.Logo,
              Image: service.Service_Provider.Image,
              Name: service.Service_Provider.Name,
            },
            Service_Area: {
              name: service.Service_Area.name,
              latitude: service.Service_Area.latitude,
              longitude: service.Service_Area.longitude,
            },
          },
        };

        const result = await serviceCollection.updateOne(query, updatedService);
        res.send(result);
      } catch (err) {
        res.send({ status: 500, message: "Internal Error" });
      }
    });
    // all delete operation
    app.delete("/api/v1/clear-user/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await usersCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send({ status: 500, message: "Internal server error" });
      }
    });

    app.delete("/api/v1/clear-service/:id", async (req, res) => {
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
    app.delete("/api/v1/user/clear-booking/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookingCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send({ status: 500, message: "Internal server error" });
      }
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
  console.log(`ServiceHub Server is running on port:${port}`);
});
