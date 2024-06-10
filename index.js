const express = require("express");
const app = express();
const cors = require("cors");
//const jwt = require('jsonwebtoken');
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kc8fcbi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    const categoryCollection = client.db("mediDB").collection("category");
    const cartCollection = client.db("mediDB").collection("carts");
    const userCollection = client.db("mediDB").collection("users");

    //user related
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Route to update user role
    app.patch("/users/:id/role", async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;

      if (!["user", "seller", "admin"].includes(role)) {
        return res.status(400).send({ message: "Invalid role" });
      }

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: role,
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc);

      if (result.modifiedCount > 0) {
        res.send({ message: "Role updated successfully" });
      } else {
        res.status(404).send({ message: "User not found" });
      }
    });



    // Route to fetch user role by email
app.post("/users/role", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send({ message: "Email is required" });
  }
  const user = await userCollection.findOne({ email });
  if (!user) {
    return res.status(404).send({ message: "User not found" });
  }

  res.send({ role: user.role });
});
//user end



    //get category
    app.get("/category", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });

    app.post("/category", async (req, res) => {
      const item = req.body;
      const result = await categoryCollection.insertOne(item);
      res.send(result);
    });



    //carts collection
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { user_email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      cartItem.count = cartItem.count || 1; 
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    //
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { menuId: id };
      const result = await cartCollection.deleteMany(query);
      res.send(result);
    });

    //for increase btn

    app.put('/carts/increase/:id', async (req, res) => {
      try {
        const result = await cartCollection.findOneAndUpdate(
          {_id: new ObjectId (req.params.id)},
          {$inc: {count: 1}},
          {returnOriginal: false}
        );
        res.json(result)
        
      }catch(error) {
        res.status(500).send(error)
      }

    })

   


    //decrease
    app.put('/carts/decrease/:id', async (req, res) => {
      try {
        const item = await cartCollection.findOne(
          {_id: new ObjectId (req.params.id)} )

          if(item.count > 1) {

            const result = await cartCollection.findOneAndUpdate(
              {_id: new ObjectId (req.params.id)},
              {$inc: {count: -1}},
              {returnOriginal: false}
            );
            res.json(result);
          }else{
            res.status(400).json({message: 'count cannot be less than 1'})
          }
         
      
        
      }catch(error) {
        res.status(500).send(error)
      }

    });




    // Clear cart
    app.delete("/carts", async (req, res) => {
      try {
        const result = await cartCollection.deleteMany({});
        res.send(result);
      } catch (error) {
        console.error("Error clearing cart:", error);
        res.status(500).send({ message: "Failed to clear cart" });
      }
    });

    // cart collection end

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
  res.send("medi-corner is running");
});

app.listen(port, () => {
  console.log(`medi-corner is running on port ${port}`);
});
