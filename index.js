const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
require("dotenv").config();
const cors = require("cors");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 3000;

//middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@muhammadcluster.h7migjc.mongodb.net/?retryWrites=true&w=majority&appName=MuhammadCluster`;

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
    const db = client.db("lawaceDB");

    const allMealCollection = db.collection("allMeals");
    const userCollection = db.collection("users");
    const requestedMealCollection = db.collection("requestedMeals");
    const reviewCollection = db.collection("reviews");
    const userPackageCollection = db.collection("userPackages");

    // ---------- Stripe Payment related API ---------- //
    // app.post("/create-payment-intent", async (req, res) => {
    //   const { price } = req.body;
    //   const priceInCent = parseFloat(price) * 100;

    //   if (!price || priceInCent < 1) return;

    //   // generate clientSecret
    //   const { client_secret } = await stripe.paymentIntents.create({
    //     amount: priceInCent,
    //     currency: "usd",
    //     // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
    //     automatic_payment_methods: {
    //       enabled: true,
    //     },
    //   });

    //   // Send client secret as response
    //   res.send({ clientSecret: client_secret });
    // });

    // //  all purchase history of specific user
    // app.get("/paymentHistory/:email", async (req, res) => {
    //   const email = req.params.email;
    //   console.log(email);
    //   const result = await userPackageCollection
    //     .find({ user_email: email })
    //     .toArray();
    //   res.send(result);
    // });

    // //  User purchasing packages save to database
    // app.post("/purchasePackage", async (req, res) => {
    //   const packageData = req.body;
    //   console.log(packageData);

    //   const query = {
    //     email: packageData?.user_email,
    //   };
    //   const updatedDoc = {
    //     $set: {
    //       badge: packageData?.plan,
    //     },
    //   };

    //   await userCollection.updateOne(query, updatedDoc);

    //   const result = await userPackageCollection.insertOne(packageData);
    //   res.send(result);
    // });

    // get a user info by email from db
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      res.send(result);
    });

    // ---------- Meals related API ---------- //

    // get all meals for admin dashboard from database
    app.get("/dasAllMeals", async (req, res) => {
      const result = await allMealCollection.find().toArray();
      res.send(result);
    });

    // get all meals data from database
    app.get("/allMeals", async (req, res) => {
      const search = req.query.search;
      const category = req.query.category;
      const price = req.query.price;

      let query = {};
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }
      if (category) {
        query.category = category;
      }
      if (price) {
        const [minPrice, maxPrice] = price.split("-").map(Number);
        query.price = { $gte: minPrice, $lte: maxPrice };
      }
      const result = await allMealCollection.find(query).toArray();
      if (result.length === 0) {
        return res.status(204).send();
      }
      res.send(result);
    });

    // get single meal data from database
    app.get("/meal/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allMealCollection.findOne(query);
      res.send(result);
    });

    // get all requested meals of all users data from database for admin panel
    app.get("/requestedMeals", async (req, res) => {
      const result = await requestedMealCollection.find().toArray();
      res.send(result);
    });

    // get all requested meals of a single user data from database
    app.get("/requestedMeals/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const result = await requestedMealCollection
        .find({ "userInfo.email": email })
        .toArray();
      res.send(result);
    });

    // Save a meal by admin to the database
    app.post("/addMeal", async (req, res) => {
      const mealData = req.body;
      console.log(mealData);
      const result = await allMealCollection.insertOne(mealData);
      res.send(result);
    });

    // Save meal request by user in the database
    app.post("/requestMeal", async (req, res) => {
      const mealData = req.body;
      const result = await requestedMealCollection.insertOne(mealData);
      res.send(result);
    });

    // To serve requested meal and update status to served in the database
    app.patch("/serveMeal/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "Served",
        },
      };
      const result = await requestedMealCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // to update likes count of meal data in the database
    app.patch("/meal/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        $inc: { likes: 1 },
      };
      const result = await allMealCollection.updateOne(query, options);
      res.send(result);
    });

    // Delete specific meal user data from database
    app.delete("/meal/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await allMealCollection.deleteOne(query);
      res.send(result);
    });

    // Delete specific requested meal of a single user data from database
    app.delete("/requestedMeals/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await requestedMealCollection.deleteOne(query);
      res.send(result);
    });

    // ---------- Users related API ---------- //

    // Check if user is admin or not
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);

      // Authorization check can be added here
      // if(email !== req.decoded.email){
      //    return res.status(403).send({message: 'unauthorized access'})
      // }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user.role === "admin";
      }
      res.send({ admin });
    });

    // Get all users for admin route from database
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Get specific user by email for user or admin profile info
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // Add user to database when user is created in the client site
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);

      // check whether user exists or not. Insert user only if user does not exist
      const query = { email: user.email };
      const existUser = await userCollection.findOne(query);
      console.log(existUser);
      if (existUser) {
        return res.send({ message: "User already exists!", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // to update likes count of meal data in the database
    app.patch("/makeAdmin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // ---------- User Reviews related API ---------- //

    // Get all reviews for specific meal item from database
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // Get all reviews for specific meal item from database
    app.get("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      console.log({ id });
      const query = { mealId: id };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    // Get all reviews for specific user from database
    app.get("/userReviews/:email", async (req, res) => {
      const email = req.params.email;
      console.log({ email });
      const query = { "reviewer.email": email };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/addReview", async (req, res) => {
      const review = req.body;
      const { mealId } = review;

      console.log("reviews information", review);
      const query = { _id: new ObjectId(mealId) };
      const options = {
        $inc: { reviews: 1 },
      };
      const result = await reviewCollection.insertOne(review);
      if (result.insertedId) {
        await allMealCollection.updateOne(query, options);
      }
      res.send(result);
    });

    // Delete a review of specific user from database
    app.patch("/updateReview/:id", async (req, res) => {
      const updateReview = req.body;
      const id = req.params.id;
      console.log("Update review for this id:", id);
      console.log(updateReview);
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          ...updateReview,
        },
      };
      const result = await reviewCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // Delete a review of specific user from database
    app.delete("/review", async (req, res) => {
      const id = req.query.id;
      const mealId = req.query.mealId;
      console.log(id, mealId);
      console.log("Delete review for this id:", id);
      const query = { _id: new ObjectId(id) };

      const filter = { _id: new ObjectId(mealId) };
      const options = {
        $inc: { reviews: -1 },
      };
      await allMealCollection.updateOne(filter, options);
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //  await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Lawace server is running here!");
});

app.listen(port, () => {
  console.log(`My Lawace app is listening on port: ${port}`);
});
