const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 33000;
const cors = require("cors");
const cookieParser = require("cookie-parser");
//Use  MiddleWare
app.use(
  cors({
    origin: ["http://localhost:5173", "https://homecare-hub-376e1.web.app"],
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
    console.log("token : ", token);
    if (!token) {
      return res.status(401).send({ message: "Unauthorized Access1" });
    }
    jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(401).send({ message: "UnAuthorized Access2" });
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
    client.connect();
    client.db("admin").command({ ping: 1 });

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
            secure: true,
            sameSite: "none",
          })
          .send({ success: true });
      } catch (err) {
        console.log(err);
        res.send({ status: 500, message: "Internal server error" });
      }
    });

    app.delete("/api/v1/auth/clear-cookie", (req, res) => {
      res.clearCookie("token").send("Cookie Cleared");
    });

    // all Collection
    const dataBaseName = client.db("ServiceHub");
    const categoryCollection = dataBaseName.collection("categories");
    const serviceCollection = dataBaseName.collection("services");
    const bookingCollection = dataBaseName.collection("bookings");
    const choseUsCollection = dataBaseName.collection("choseUs");
    const reviewCollection = dataBaseName.collection("review");
    const usersCollection = dataBaseName.collection("users");
    const sponsorCollection = dataBaseName.collection("sponsor");
    const teamCollection = dataBaseName.collection("team");
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
        const email = req.query.email;
        const offer = req.query.Offer;
        const minPrice = parseFloat(req.query.minPrice);
        const maxPrice = parseFloat(req.query.maxPrice);
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const skip = (page - 1) * limit;
        let serviceName = req.query.service_name;
        const category = req.query.category;
        if (email) {
          const myService = await serviceCollection
            .find({ "Service_Provider.Email": email })
            .toArray();
          res.send(myService);
          return;
        }

        if (offer) {
          const query = { Offer: { $exists: true } };
          const result = await serviceCollection
            .find(query)
            .limit(limit)
            .toArray();
          return res.send(result);
        }

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

    app.get("/api/v1/offer/count", async (req, res) => {
      const offer = req.query.Offer;
      if (offer) {
        const query = { Offer: { $exists: true } };
        const result = await serviceCollection.countDocuments(query);
        res.send({ result });
      }
    });
    app.get("/api/v1/service/count", async (req, res) => {
      const offer = req.query.Offer;
      const result = await serviceCollection.countDocuments(offer);
      res.send({ totalServices: result });
    });
    app.get("/api/v1/booking/count", verify, async (req, res) => {
      try {
        const decodedEmail = req.email;
        const customerEmail = req.query.email;
        if (decodedEmail.email !== customerEmail) {
          return res.status(403).send({ message: "Forbidden Access" });
        }

        const result = await bookingCollection.countDocuments({
          "customer.email": customerEmail,
        });

        result === 0 ? res.json({ booking: 0 }) : res.json({ booking: result });
      } catch (error) {
        res.status(500).send({ status: 500, message: "Internal Server Error" });
      }
    });
    app.get("/api/v1/employee", verify, async (req, res) => {
      try {
        const decodedEmail = req.email;
        const email = req.query.email;
        console.log(email, decodedEmail);

        if (decodedEmail.email !== email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }

        const result = await teamCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ status: 500, message: "Internal Server Error" });
      }
    });
    app.get("/api/v1/service/:id", async (req, res) => {
      try {
        // const decodedEmail = req.email;
        // const user = req.body;
        // console.log(user, decodedEmail);
        // if (decodedEmail.email !== user.email) {
        //   return res.status(403).send({ message: "Forbidden Access" });
        // }
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
    app.get("/api/v1/customer/bookings", verify, async (req, res) => {
      try {
        const queryObj = {};
        const decodedEmail = req.email;
        const email = req.query.email;

        if (decodedEmail.email !== email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
        if (email) {
          queryObj["provider.Email"] = email;
        }
        const result = await bookingCollection.find(queryObj).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ status: 500, message: "Internal Server Error" });
      }
    });
    app.get("/api/v1/sponsor", async (req, res) => {
      try {
        const result = await sponsorCollection.find().toArray();
        res.send(result);
      } catch (error) {
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

    app.get("/api/v1/choseUs", async (req, res) => {
      try {
        const result = await choseUsCollection.find().toArray();
        res.send(result);
      } catch (err) {
        res.send({ status: 500, message: "Internal Server Error" });
      }
    });
    // All the post operation

    app.post("/api/v1/create-service", verify, async (req, res) => {
      try {
        const email = req.query.email;
        const decodedEmail = req.email;

        if (decodedEmail.email !== email) {
          return res.status(403).send({ message: "Forbidden" });
        }
        const data = req.body;
        console.log(data);
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
    app.put("/api/v1/update/booking/:id", verify, async (req, res) => {
      try {
        const id = req.params.id;
        const email = req.query.email;
        const decodedEmail = req.email;
        const data = req.body.status.toLowerCase();
        console.log(email, data);

        if (email !== decodedEmail.email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
        const query = { _id: new ObjectId(id) };
        const update = {
          $set: {
            "customer.status": data,
          },
        };
        const result = await bookingCollection.updateOne(query, update);
        res.send(result);
      } catch (error) {
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
    app.delete("/api/v1/clear-allServices", verify, async (req, res) => {
      try {
        const email = req.query.email;
        const decodedEmail = req.email;
        if (decodedEmail.email !== email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
        const result = await serviceCollection.deleteMany({
          "Service_Provider.Email": email,
        });
        res.send(result);
      } catch (error) {
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
    app.delete("/api/v1/user/clear-allBooking", verify, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.email;
      if (decodedEmail.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const result = await bookingCollection.deleteMany({
        "customer.email": email,
      });
      res.send(result);
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
