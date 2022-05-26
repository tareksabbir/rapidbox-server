const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const app = express()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lsapx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized Access' })
    }
    const token = authHeader.split(' ')[1];
    // console.log(token)
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
    });
}


async function run() {
    try {
        await client.connect();
        const toolsCollection = client.db('rapidbox').collection('tools');
        const usersCollection = client.db('rapidbox').collection('users');
        const reviewCollection = client.db('rapidbox').collection('reviews');
        const orderCollection = client.db('rapidbox').collection('orders');

        app.get('/tools', async (req, res) => {
            const query = {};
            const cursor = toolsCollection.find(query);
            const tools = await cursor.toArray();
            res.send(tools);
        })

        app.get("/tools/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const tools = await toolsCollection.findOne(query);
            res.send(tools);

        })
        app.post('/tools', async (req, res) => {
            const newProduct = req.body;
            const result = await toolsCollection.insertOne(newProduct)
            res.send(result);
        })
        app.delete('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await toolsCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/user', async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        })

        app.get("/user/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const users = await usersCollection.findOne(query);
            res.send(users);

        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });

        })

        app.patch('/user/:email', async (req, res) => {
            const email = req.params.email;
            const updatedProfile = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    displayName: updatedProfile.displayName,
                    gender: updatedProfile.gender,
                    education: updatedProfile.education,
                    photoURL: updatedProfile.photoURL,
                    company: updatedProfile.company,
                    about: updatedProfile.about,
                    address: updatedProfile.address,
                }
            };
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.send(result);

            }
            else {
                return res.status(403).send({ message: 'Forbidden Access' })
            }

        })

        app.delete('/user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })


        app.get('/review', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews)

        })

        app.post('/review', async (req, res) => {
            const newReview = req.body;
            const result = await reviewCollection.insertOne(newReview);
            res.send(result);
        })
        app.get('/order', async (req, res) => {
            const query = {};
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders)

        })

        app.get('/order/buyer', async (req, res) => {
            const buyerEmail = req.query.buyerEmail;
            const query = { buyerEmail: buyerEmail };
            const order = await orderCollection.find(query).toArray();
            res.send(order)
        })

        app.post('/order', async (req, res) => {
            const newOrder = req.body;
            const result = await orderCollection.insertOne(newOrder);
            res.send(result);
        })


    } finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello From Rapidbox server!')
})

app.listen(port, () => {
    console.log(`Rapidbox listening on port ${port}`)
})