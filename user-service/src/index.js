const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

const port = 3000;

const app = express();

app.use(express.json())

// Middleware to log all incoming requests
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
    const body = req.body || {};
    if (typeof body === 'object' && Object.keys(body).length > 0) {
        console.log(`Body: ${JSON.stringify(body)}`);
    }
    next();
})

app.get('/', (req, res) => {
    res.send('Hello World')
})

mongoose.connect('mongodb://mongo:27017/Users')
    .then(() => { console.log('Connected to MongoDB') })
    .catch((err) => { console.error('Failed to connect to MongoDB', err) })

//create user schema and model
const userSchema = new mongoose.Schema({
    name: String,
    email: String
})

const User = mongoose.model('User', userSchema)

app.post('/users', async (req, res) => {
    try {
        const { name, email } = req.body;
        console.log('Received request to create user with data:', req.body)
        console.log('Received user data:', { name, email })
        if (!name || !email) {
            return res.status(400).send('Name and email are required')
        }
        const user = new User({ name, email })
        await user.save()
        res.status(201).json(user)
    } catch (error) {
        console.error('Error creating user:', error)
        res.status(500).json({ error: 'Failed to create user', details: error.message })
    }
})

// get all users

app.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        return res.status(200).json(users)
    } catch (error) {
        console.error('Error fetching users:', error)
        res.status(500).json({ error: 'Failed to fetch users', details: error.message })
    }
})

app.listen(port, () => {
    console.log(`User Service is running on port ${port}`)
})