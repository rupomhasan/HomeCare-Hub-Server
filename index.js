const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 25000;
const cors = require("cors");
const cookieParser = require("cookie-parser");
//Use  MiddleWare
app.use(
  cors({
    origin: [""],
    credentials: true,
  })
);
app.use(cookieParser());
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

const verify = (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).send({ message: "Unauthorized Access" });
    }
    jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(401).send({ message: "UnAuthorized Access" });
      }
      req.email = decoded;
      next();
    });
  } catch (err) {
    res.status(500).send({ status: 500, message: "Internal Server Error" });
  }
};

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });

    //Auth connection

    app.post("/api/v1/auth/access-token", async (req, res) => {
      try {
        const email = req.body;

        const token = jwt.sign(email, process.env.SECRET_TOKEN, {
          expiresIn: "1h",
        });

        res
          .cookie("token", token, {
            httpOnly: true,
          })
          .send({ success: true });
      } catch (err) {
        console.log(err);
        res.send({ status: 500, message: "Internal server error" });
      }
    });

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
    app.get("/api/v1/services", verify, async (req, res) => {
      try {
        const decodedEmail = req.email;
        const user = req.body;
        console.log(user, decodedEmail);
        if (decodedEmail.email !== user.email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }

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
    app.get("/api/v1/service/:id", verify, async (req, res) => {
      try {
        const decodedEmail = req.email;
        const user = req.body;
        console.log(user, decodedEmail);
        if (decodedEmail.email !== user.email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
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

    app.get("/api/v1/user/bookings", verify, async (req, res) => {
      try {
        const queryObj = {};
        const decodedEmail = req.email;
        const email = req.query.email;

        if (decodedEmail.email !== email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
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
    app.get("/api/v1/users", verify, async (req, res) => {
      try {
        let queryObj = {};
        const email = req.query.email;
        const decodedEmail = req.email;

        if (decodedEmail.email !== email) {
          return res.status(403).send({ message: "Forbidden" });
        }
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
    app.post("/api/v1/user/create-booking", verify, async (req, res) => {
      try {
        const data = req.body;
        const decodedEmail = req.email;
        const email = data.customer.email;
        if (decodedEmail.email !== email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
        console.log(decodedEmail, email);

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
    app.delete("/api/v1/clear-user/:id", verify, async (req, res) => {
      try {
        const id = req.params.id;
        const email = req.query.email;
        const decodedEmail = req.email;

        if (email !== decodedEmail.email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
        const query = { _id: new ObjectId(id) };
        const result = await usersCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send({ status: 500, message: "Internal server error" });
      }
    });

    app.delete("/api/v1/clear-service/:id", verify, async (req, res) => {
      try {
        const id = req.params.id;
        const decodedEmail = req.email;
        const query = { _id: new ObjectId(id) };
        const data = await serviceCollection.findOne(query);
        const email = data?.Service_Provider?.Email;
        console.log(email, decodedEmail);
        if (decodedEmail.email !== email) {
          res.status(403).send({ message: "Forbidden Access" });
        }
        const result = await serviceCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
        res.status(500).send({ status: 500, message: "Internal server error" });
      }
    });
    app.delete("/api/v1/user/clear-booking/:id", verify, async (req, res) => {
      try {
        const id = req.params.id;
        const email = req.query.email;
        const decodedEmail = req.email;
        if (decodedEmail.email !== email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
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
