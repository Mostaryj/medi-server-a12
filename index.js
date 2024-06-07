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

    //get category
    app.get("/category", async (req, res) => {
      const result = await categoryCollection.find().toArray();
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
 

   // POST method to increase the quantity of an item in the cart
  //  app.post("/carts/increase/:id", async (req, res) => {
  //   const id = req.params.id;
  //   const quantity = req.body.quantity; // Quantity to increase
  
  //   try {
  //     const item = await cartCollection.findOne({ _id: new ObjectId(id) });
  //     if (!item) {
  //       return res.status(404).json({ message: "Item not found in cart" });
  //     }
  
  //     // Proceed to the PUT route to increase the quantity
  //     const result = await cartCollection.updateOne(
  //       { _id: new ObjectId(id) },
  //       { $inc: { quantity: quantity } }
  //     );
  
  //     if (result.modifiedCount > 0) {
  //       res.status(200).json({ message: "Quantity increased successfully" });
  //     } else {
  //       res.status(404).json({ message: "Item not found in cart" });
  //     }
  //   } catch (error) {
  //     console.error("Error increasing quantity:", error);
  //     res.status(500).json({ message: "Failed to increase quantity" });
  //   }
  // });
  

  app.put("/carts/increase/:id", async (req, res) => {
    const id = req.params.id;
    const quantity = req.body.quantity; // Quantity to increase
  
    try {
      const result = await cartCollection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { quantity: quantity } }
      );
  
      if (result.modifiedCount > 0) {
        res.status(200).json({ message: "Quantity increased successfully" });
      } else {
        res.status(404).json({ message: "Item not found in cart" });
      }
    } catch (error) {
      console.error("Error increasing quantity:", error);
      res.status(500).json({ message: "Failed to increase quantity" });
    }
  });
  

  



    // Decrease item quantity
    app.delete("/carts/decrease/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
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
