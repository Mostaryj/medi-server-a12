const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
require("dotenv").config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
//
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');


// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from the uploads directory
app.use('/uploads', express.static(uploadsDir));


//middleware
app.use(cors());
app.use(express.json());
//
app.use(express.urlencoded({ extended: true })); 
app.use(fileUpload());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kc8fcbi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//



async function run() {
  try {
    const categoryCollection = client.db("mediDB").collection("category");
    const categoryCardCollection = client.db("mediDB").collection("categoryCard");
    const cartCollection = client.db("mediDB").collection("carts");
    const userCollection = client.db("mediDB").collection("users");
    const sliderCollection = client.db("mediDB").collection("slider");
    const paymentCollection = client.db("mediDB").collection("payments");



  //jwt related api
  app.post('/jwt', async(req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '22h'})
    res.send({token});
})


//middlewares
const verifyToken = (req, res, next) => {
  // console.log('inside verify token',req.headers.authorization);
  if(!req.headers.authorization){
          return res.status(401).send({message: 'unauthorized access'});
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.decoded = decoded;
    next();
  })
}

 //use verify admin after verifyToken
 const verifyAdmin = async(req,res,next) => {
  const email = req.decoded.email;   
  const query =  {email: email};
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  if(!isAdmin){
    return res.status(403).send({message: 'forbidden access'})
  }
  next();
}



//slider  



app.get("/slider/:email",async(req,res)=>{
  const email=req.params.email;
   console.log(email);
  const query ={email:email};
  // console.log(query);
  const result =await sliderCollection.find(query).toArray();
  console.log(result);
    res.send(result);
})



// Get all slider requests (for admin)
app.get("/slider", async (req, res) => {
  try {
      const sliderRequests = await sliderCollection.find().toArray();
      res.send(sliderRequests);
  } catch (error) {
      res.status(500).send({ error: 'Error fetching slider requests' });
  }
});






    //admin api
  app.get('/users/admin/:email', verifyToken, async(req, res) => {
    const email = req.params.email;

    if(email !== req.decoded.email){
      return res.status(403).send({message: 'forbidden access'})

    }
    const query = {email: email}
    const user = await userCollection.findOne(query);
    let admin = false;
    if(user){
      admin = user?.role === 'admin';
    }
    res.send({admin});
} )



    //user related
    app.get("/users",verifyToken,verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    //  update user role
    app.patch("/users/:id/role",verifyToken, verifyAdmin, async (req, res) => {
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



    //  user role by email
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

//edited
app.get("/users/:email", async (req, res) => {
  const result = await userCollection.findOne({email: req.params.email});
  res.send(result);
});
//user end

  //category card for home page

  app.post("/categoryCard", async (req, res) => {
    const item = req.body;
    const result = await categoryCardCollection.insertOne(item);
    res.send(result);
  });
  
  app.get("/categoryCard", async (req, res) => {
    const result = await categoryCardCollection.find().toArray();
    res.send(result);
  });


  // delete
  app.delete("/categoryCard/:id", async (req, res) => {
    try {
      const id = req.params.id;
      console.log(id);
      const result = await categoryCardCollection.deleteOne({ _id: new ObjectId(id) });
      res.json(result);
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

 // Update a category
 app.put('/categoryCard/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { category, number_of_medicine } = req.body;

    let imageUrl = req.body.image; // default to existing image URL
    if (req.files && req.files.image) {
      const imageFile = req.files.image;
      // Save the file to the uploads directory
      imageUrl = `/uploads/${imageFile.name}`;
      await imageFile.mv(path.join(uploadsDir, imageFile.name)); 
    }

    const updatedCategory = { category, number_of_medicine, image: imageUrl };

    console.log('Received ID:', id);
    console.log('Updated Category Data:', updatedCategory);

    const result = await categoryCardCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedCategory }
    );
    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





    //get medicine for shop
    app.get("/category", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });

    //
    app.get("/category/:email", async (req, res) => {
      const email = req.params.email; // Use req.params to access route parameters
      const query = { seller_email: email };
      const result = await categoryCollection.find(query).toArray();
      res.send(result);
  });

  //for seller
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

    
    //payment intent
    app.post('/payment-intent', async (req, res) => {
      const {price} = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    //payment

     //remove cart item after payment
     app.post('/payments',async(req,res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      //delete each item from the cart
       console.log('payment info', payment);
       const query = {_id: {
        $in: payment.cartIds.map(id => new ObjectId(id))
       }};

       const deleteResult = await cartCollection.deleteMany(query)
       res.send({paymentResult, deleteResult})
    })


        //get payment data
        app.get('/payments/:email',verifyToken, async(req, res) => {
          const query = {email: req.params.email}
          if(req.params.email !== req.decoded.email){
            return res.status(403).send({message: 'forbidden access'})
          }
          const result = await paymentCollection.find(query).toArray();
          res.send(result)
        })



        // Get all payments for admin
    app.get('/payments', async (req, res) => {
    try {
      const payments = await paymentCollection.find().toArray();
      res.send(payments);
    } catch (error) {
      res.status(500).send({ message: 'Internal Server Error' });
   }
   });



   // Update payment status
app.patch('/payments/:id', async (req, res) => {
  const paymentId = req.params.id;
  const updatedStatus = req.body.status;

  try {
      const result = await paymentCollection.updateOne(
          { _id: new ObjectId(paymentId) },
          { $set: { status: updatedStatus } }
      );
      res.send(result);
  } catch (error) {
      res.status(500).send({ message: 'Internal Server Error' });
  }
});


    //analytics
app.get('/admin-stats', verifyToken, verifyAdmin, async(req, res) => { 
  try {
    const users = await userCollection.estimatedDocumentCount();
    const menuItems = await categoryCollection.estimatedDocumentCount();
    const orders = await paymentCollection.estimatedDocumentCount();

    const revenueResult = await paymentCollection.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $toDouble: '$price' } }
        }
      }
    ]).toArray();
    const revenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    const pendingResult = await paymentCollection.aggregate([
      {
        $match: { status: 'pending' }
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: { $toDouble: '$price' } }
        }
      }
    ]).toArray();
    const totalPending = pendingResult.length > 0 ? pendingResult[0].totalPending : 0;

    res.send({
      users,
      menuItems,
      orders,
      revenue,
      totalPending
    });
  } catch (error) {
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

//sales
app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const sales = await paymentCollection.find().toArray();
    res.send(sales);
  } catch (error) {
    res.status(500).send({ message: 'Internal Server Error' });
  }
});




// Get total paid and pending revenue for seller
app.get('/seller-sales/:email', verifyToken, async (req, res) => {
  const sellerEmail = req.decoded.seller_email;
  console.log(sellerEmail);

  try {
      const paidResult = await paymentCollection.aggregate([
          {
              $match: {
                  sellerEmail,
                  status: 'paid' 
              }
          },
          {
              $group: {
                  _id: null,
                  totalPaid: {
                      $sum: {
                          $toDouble: '$price' 
                      }
                  }
              }
          }
      ]).toArray();

      const pendingResult = await paymentCollection.aggregate([
          {
              $match: {
                  sellerEmail,
                  status: 'pending' 
              }
          },
          {
              $group: {
                  _id: null,
                  totalPending: {
                      $sum: {
                          $toDouble: '$price' 
                      }
                  }
              }
          }
      ]).toArray();

      const totalPaid = paidResult.length > 0 ? paidResult[0].totalPaid : 0;
      const totalPending = pendingResult.length > 0 ? pendingResult[0].totalPending : 0;

      res.send({ totalPaid, totalPending });
  } catch (error) {
      console.error('Error fetching sales data:', error);
      res.status(500).send({ error: 'Internal Server Error' });
  }
});


// app.get('/seller-sales', verifyToken, async (req, res) => {
//   const sellerEmail = req.decoded.seller_email;
//   try {
//       const paidResult = await paymentCollection.aggregate([
//           {
//               $match: {
//                   sellerEmail,
//                   status: 'paid' 
//               }
//           },
//           {
//               $group: {
//                   _id: null,
//                   totalPaid: {
//                       $sum: {
//                           $toDouble: '$price' 
//                       }
//                   }
//               }
//           }
//       ]).toArray();

//       const pendingResult = await paymentCollection.aggregate([
//           {
//               $match: {
//                   sellerEmail,
//                   status: 'pending' 
//               }
//           },
//           {
//               $group: {
//                   _id: null,
//                   totalPending: {
//                       $sum: {
//                           $toDouble: '$price' 
//                       }
//                   }
//               }
//           }
//       ]).toArray();

//       const totalPaid = paidResult.length > 0 ? paidResult[0].totalPaid : 0;
//       const totalPending = pendingResult.length > 0 ? pendingResult[0].totalPending : 0;

//       res.send({ totalPaid, totalPending });
//   } catch (error) {
//       console.error('Error fetching sales data:', error);
//       res.status(500).send({ error: 'Internal Server Error' });
//   }
// });




//  payments for a specific seller
app.get("/seller-payments/:email", async (req, res) => {
  const { seller_email } = req.params; 
  try {
    const payments = await paymentCollection.find({ sellerEmail: seller_email }).toArray();
    res.send(payments);
  } catch (error) {
    console.error('Error fetching seller payments:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});




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
