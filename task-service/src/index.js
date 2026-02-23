const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const amqp = require('amqplib');

const port = 3001;

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

let channel, connection;
async function connectRabbitMQWithRetry(retries = 5, delay = 5000) {
    while (retries) {
        try {
            connection = await amqp.connect('amqp://rabbitmq');
            channel = await connection.createChannel();
            await channel.assertQueue('task_created');
            console.log('Connected to RabbitMQ');
            return;
        } catch (err) {
            console.log('RabbitMQ connection failed. Retrying...');
            retries--;
            console.log('Retries left:', retries);
            await new Promise(res => setTimeout(res, delay));
        }
    }

    console.error('Could not connect to RabbitMQ after retries');
}

app.get('/', (req, res) => {
    res.send('Hello World')
})

mongoose.connect('mongodb://mongo:27017/Tasks')
    .then(() => { console.log('Connected to MongoDB') })
    .catch((err) => { console.error('Failed to connect to MongoDB', err) })

//create user schema and model
const taskSchema = new mongoose.Schema({
    title: String,
    description: String,
    userId: String
})

const Task = mongoose.model('Task', taskSchema)

app.post('/tasks', async (req, res) => {
    try {
        const { title, description, userId } = req.body;
        console.log('Received request to create task with data:', req.body)
        console.log('Received task data:', { title, description, userId })
        if (!title || !description || !userId) {
            return res.status(400).send('Title, description and userId are required')
        }
        const task = new Task({ title, description, userId })
        await task.save()

        const message = {
            taskId: task._id,
            title: task.title,
            description: task.description,
        }

        if (!channel) {
            console.error('No RabbitMQ channel available, cannot publish message');
        }

        await channel.sendToQueue('task_created', Buffer.from(JSON.stringify(message)));
        console.log('Published task_created event to RabbitMQ:', message);
        res.status(201).json(task);
    } catch (error) {
        console.error('Error creating task:', error)
        res.status(500).json({ error: 'Failed to create task', details: error.message })
    }
})

// get all tasks

app.get('/tasks', async (req, res) => {
    try {
        const tasks = await Task.find();
        return res.status(200).json(tasks)
    } catch (error) {
        console.error('Error fetching tasks:', error)
        res.status(500).json({ error: 'Failed to fetch tasks', details: error.message })
    }
})

app.listen(port, () => {
    console.log(`Task Service is running on port ${port}`)
    connectRabbitMQWithRetry();
})