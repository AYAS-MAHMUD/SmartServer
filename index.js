const express = require("express");
const cors = require("cors");
const app = express();
const admin = require("firebase-admin");
const port = process.env.PORT || 3000;
require('dotenv').config()
// console.log(process.env)

// Connet mongoDB
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fqjmyg3.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});



// firebase admin sdk
const serviceAccount = require("./smart-deal-firebase-admin-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// middleware start
app.use(cors());
app.use(express.json());

const logger=(req,res,next)=>{
  console.log("login  information")
  next()
}

// firebase token varify middleware
const varifyFirebaseToken=async(req,res,next)=>{
  console.log('in the varify middleware',req.headers.authurization)
  if(!req.headers.authurization){
    //do not allow to access
    return res.status(401).send({message: 'Unauthurized access'})
  }
  const token = req.headers.authurization.split(' ')[1]
  if(!token){
    return res.status(401).send({message: 'Unauthurized access'})
  }

  try{
    const user = await admin.auth().verifyIdToken(token)
    console.log(user)
    next()
  }
  catch{
    return res.status(401).send({message: 'Unauthurized access'})
  }


  
}
// middleware end

// By default code
app.get("/", (req, res) => {
  res.send("Hello world 30000");
});

async function run() {
  try {
    await client.connect();

    const db = client.db("smart_db");
    const productsCollection = db.collection("product");
    const bidsCollection = db.collection("bids");
    const usersCollection = db.collection('users');

    // USER POST 
    app.post('/users',async(req,res)=>{
      const newUser = req.body;

      const email = req.body.email;
      const query = {email: email}
      const existingUser = await usersCollection.findOne(query)
      if(existingUser){
        res.send("user already exits. do not need to insert again")
      }
      else{
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
      
    })
    // USER GET DATA`
    app.get('/latest-products',async(req,res)=>{
      const cursor = productsCollection.find().sort({created_at : -1}).limit(6)
      const result = await cursor.toArray();
      res.send(result);
    })

    //PRODUCT POST DATA
    app.post("/product", async (req, res) => {
      console.log('header in the post ',req.headers)
      const newProducts = req.body;
      const result = await productsCollection.insertOne(newProducts);
      res.send(result);
    });

    //PRODUCT DELETE DATA
    app.delete("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    //PRODUCT UPDATE DATA
    app.patch("/product/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          name: updatedProduct.name,
          price: updatedProduct.price,
        },
      };

      const options = {};
      const result = await productsCollection.updateOne(query, update, options);
      res.send(result);
    });

    // GET DATA FROM MONGODB
    app.get("/product", async (req, res) => {
      const productFields = { title: 1, price: 1, category: 1 };
      //   const cursor = productsCollection.find().sort({ price_min: 1 }).skip(2).limit(5).project(productFields);

      //   console.log(req.query);
      // get data via email
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }

      const cursor = productsCollection.find(query);

      const result = await cursor.toArray();
      res.send(result);
    });

    //   GET SINGLE DATA FROM DATABASE
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      // const query = { _id: new ObjectId(id) };
      const query = { _id: id };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    // Bids related api
    // GET DATA FROM DB
    app.get("/bids",logger,varifyFirebaseToken, async (req, res) => {
      const email = req.query.email;
      console.log('headers:',req.headers)
      const query = {}
      if(email){
        query.buyer_email = email;
      }
      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // GET PERTICULER DATA VIA PRODUCT IT
      app.get('/product/bids/:productId',async(req,res)=>{
        const productId = req.params.productId;
        const query = {product : productId};
        const cursor = bidsCollection.find(query).sort({bid_price : -1})
        const result = await cursor.toArray()
        res.send(result)
      })
    // POST DATA IN DB
    app.post('/bids',async(req,res)=>{
        const newBid = req.body;
        const result = await bidsCollection.insertOne(newBid);
        res.send(result);
    })
    //GET DATA FROM BIDS VIA EMAIL
    app.get('/bids',async(req,res)=>{
      // http://localhost:3000/bids?email=ayasmahmud48@gmail.com
      const email = req.query.email;
      const query = {};
      if (email) {
        query.buyer_email = email;
      }
      
      const cursor = productsCollection.find(query);

      const result = await cursor.toArray();
      res.send(result);
    })

    //DELETE DATA FROM BID
    app.delete('/bids/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await bidsCollection.deleteOne(query);
      res.send(result);
    })
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("Smart server is running");
});