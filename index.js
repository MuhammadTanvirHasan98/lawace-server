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
    const db = client.db("lawaceDB");

    const allBlogCollection = db.collection("blogs");
    const userCollection = db.collection("users");
    const lawyerCollection = db.collection("lawyers");
    const allCommentCollection = db.collection("comments");
    const requestedMealCollection = db.collection("requestedMeals");
    const reviewCollection = db.collection("reviews");
    const userPackageCollection = db.collection("userPackages");
    const ratingCollection = db.collection("ratings");

    // ********** Users Related API *********//
    // get a user info by email from db
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      res.send(result);
    });

    // Add user to database when user is created in the client site
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);

      // check whether user exists or not. Insert user only if user does not exist
      const query = { email: user.email };
      const existUser = await userCollection.findOne(query);
      console.log("Check user is present or not:", existUser);
      if (existUser) {
        return res.send({ message: "User already exists!", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // ********** Users API  Ends here*********//

    // ********** Lawyers Related API *********//
    // get all lawyers info from database
    app.get("/lawyers", async (req, res) => {
      const result = await lawyerCollection.find().toArray();
      res.send(result);
    });

    // get a single lawyer info for lawyer details page from database
    app.get("/lawyer/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await lawyerCollection.findOne(query);
      res.send(result);
    });

    // get a lawyer info by email from database
    app.get("/lawyer/:email", async (req, res) => {
      const lawyer_email = req.params.email;
      const result = await lawyerCollection.findOne({ lawyer_email });
      res.send(result);
    });

    // Add or Update new or existing lawyer to the database
    app.put("/lawyer/:email?", async (req, res) => {
      const email = req.params.email;
      const lawyerProfile = req.body;
      console.log("Lawyer Info:", { lawyerProfile, email });
      const query = { lawyer_email: lawyerProfile?.lawyer_email };

      const options = { upsert: true }; // Create if it doesn't exist
      const updateDoc = { $set: { ...lawyerProfile } };
      const result = await lawyerCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // ********** Lawyer API  Ends here*********//

    //*************** Blogs API **************//

    // ******* Fetch All blogs from the DB ******//
    app.get("/blogs", async (req, res) => {
      const search = req.query.search;
      let query = {};
      if (search) {
        query.blog_title = { $regex: search, $options: "i" };
      }
      const result = await allBlogCollection.find(query).toArray();
      res.send(result);
    });

    // get single blog data from database
    app.get("/blog/:id", async (req, res) => {
      const id = req.params.id;
      console.log("Get blog id:", id);
      const query = { _id: new ObjectId(id) };
      const result = await allBlogCollection.findOne(query);
      res.send(result);
    });

    // Save a blog by user and lawyer to the database
    app.post("/blog", async (req, res) => {
      const blogInfo = req.body;
      console.log(blogInfo);
      const result = await allBlogCollection.insertOne(blogInfo);
      res.send(result);
    });

    // to update likes count of meal data in the database
    app.patch("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        $inc: { like: 1 },
      };
      const result = await allBlogCollection.updateOne(query, options);
      res.send(result);
    });
    //****** Blogs API Ends here *******//

    // ---------- Comments related API ---------- //
    // get all comments for specific blog from database
    app.get("/comments/:id", async (req, res) => {
      const id = req.params.id;
      console.log("Comment blog id:", id);
      const query = { blogId: id };
      const result = await allCommentCollection.find(query).toArray();
      res.send(result);
    });
    // Save a comment by user and lawyer to the database
    app.post("/comment", async (req, res) => {
      const commentInfo = req.body;
      console.log(commentInfo);
      const result = await allCommentCollection.insertOne(commentInfo);
      res.send(result);
    });
    // ---------- Comments API Ends here ---------- //

    // ---------- Meals related API ---------- //

    // get all meals for admin dashboard from database
    app.get("/dasAllMeals", async (req, res) => {
      const result = await allBlogCollection.find().toArray();
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
      const result = await allBlogCollection.find(query).toArray();
      if (result.length === 0) {
        return res.status(204).send();
      }
      res.send(result);
    });

    // get single meal data from database
    app.get("/meal/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allBlogCollection.findOne(query);
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
      const result = await allBlogCollection.updateOne(query, options);
      res.send(result);
    });

    // Delete specific meal user data from database
    app.delete("/meal/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await allBlogCollection.deleteOne(query);
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
        await allBlogCollection.updateOne(query, options);
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
      await allBlogCollection.updateOne(filter, options);
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    });

    // Add endpoint to check if user has already rated
    app.get('/ratings/:lawyerId/:userId', async (req, res) => {
      try {
        const { lawyerId, userId } = req.params;
        
        const existingRating = await ratingCollection.findOne({
          lawyerId,
          userId
        });

        res.json({ hasRated: !!existingRating, rating: existingRating?.rating || 0 });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Modify the existing ratings endpoint to store user ratings
    app.post('/ratings', async (req, res) => {
      try {
        const { lawyerId, userId, rating } = req.body;
        
        // Check if user has already rated
        const existingRating = await ratingCollection.findOne({
          lawyerId,
          userId
        });

        if (existingRating) {
          return res.status(400).json({ error: 'User has already rated this lawyer' });
        }

        // Store the rating
        await ratingCollection.insertOne({
          lawyerId,
          userId,
          rating,
          timestamp: new Date()
        });

        // Update lawyer's total rating
        const result = await lawyerCollection.updateOne(
          { _id: new ObjectId(lawyerId) },
          {
            $inc: {
              totalRating: rating,
              ratingCount: 1
            }
          }
        );

        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
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
