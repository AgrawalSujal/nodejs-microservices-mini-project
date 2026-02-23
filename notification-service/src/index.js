const amqp = require('amqplib');
const express = require('express');
const app = express();
const port = 3002;

async function start() {
    try {
        const connection = await amqp.connect('amqp://rabbitmq');
        const channel = await connection.createChannel();
        await channel.assertQueue('task_created');
        console.log('Connected to RabbitMQ and listening for task_created events');

        channel.consume('task_created', (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                console.log('Received task_created event:', data.title);
                console.log('Received task_created event:', data);
                channel.ack(msg);
            }
        });
    } catch (err) {
        console.error('Failed to connect to RabbitMQ:', err);
    }
}


app.listen(port, () => {
    console.log(`Notification Service is running on port ${port}`)
    start()
})