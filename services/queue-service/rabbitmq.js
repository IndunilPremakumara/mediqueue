const amqp = require("amqplib");
const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL);

let channel;

async function connectRabbitMQ() {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
    channel = await connection.createChannel();

    await channel.assertExchange("mediqueue", "topic", { durable: true });
}

function publishEvent(routingKey, message) {
    if (!channel) {
        console.error(`❌ Cannot publish event ${routingKey}: RabbitMQ channel not initialized`);
        return;
    }
    console.log(`📡 Publishing event: ${routingKey}`, message);
    channel.publish(
        "mediqueue",
        routingKey,
        Buffer.from(JSON.stringify(message))
    );
}

async function consumeEvents(io) {
    if (!channel) await connectRabbitMQ();

    // appointment.booked → add to Redis queue + notify doctor
    const bookedQueue = await channel.assertQueue("", { exclusive: true });
    await channel.bindQueue(bookedQueue.queue, "mediqueue", "appointment.booked");

    channel.consume(bookedQueue.queue, async (msg) => {
        if (!msg) return;
        const { doctor_id, patient_name, appointment_time } = JSON.parse(msg.content.toString());
        console.log(`[Queue] Received booking: ${patient_name} for ${doctor_id} at ${appointment_time}`);

        const queueKey = `queue:${doctor_id}`;
        await redis.zadd(queueKey, Date.now(), patient_name);

        // Store extra info like appointment time
        await redis.hset(`info:${doctor_id}:${patient_name}`, "time", appointment_time || "N/A");

        // Get queue position
        const position = await redis.zrank(queueKey, patient_name) + 1;
        const queueLength = await redis.zcard(queueKey);
        const estimatedWait = position * 15; // Assume 15 min per patient

        io.to(`doctor_${doctor_id}`).emit("queueUpdated", {
            message: `${patient_name} joined the queue`,
        });

        // Publish queue update for notifications
        publishEvent("queue.updated", {
            patient_id: patient_name, // Assuming patient_name is ID for now
            doctor_id,
            position,
            estimated_wait: estimatedWait,
            queue_length: queueLength
        });

        console.log(`✅ Added ${patient_name} to queue for doctor ${doctor_id}`);
        channel.ack(msg);
    });

    // appointment.cancelled → remove from Redis queue + notify doctor
    const cancelledQueue = await channel.assertQueue("", { exclusive: true });
    await channel.bindQueue(cancelledQueue.queue, "mediqueue", "appointment.cancelled");

    channel.consume(cancelledQueue.queue, async (msg) => {
        if (!msg) return;
        const { doctor_id, patient_name } = JSON.parse(msg.content.toString());

        const queueKey = `queue:${doctor_id}`;
        await redis.zrem(queueKey, patient_name);

        io.to(`doctor_${doctor_id}`).emit("queueUpdated", {
            message: `${patient_name} left the queue`,
        });

        console.log(`✅ Removed ${patient_name} from queue for doctor ${doctor_id}`);
        channel.ack(msg);
    });

    // appointment.finished → remove from Redis queue + notify doctor
    const finishedQueue = await channel.assertQueue("", { exclusive: true });
    await channel.bindQueue(finishedQueue.queue, "mediqueue", "appointment.finished");

    channel.consume(finishedQueue.queue, async (msg) => {
        if (!msg) return;
        const { doctor_id, patient_name } = JSON.parse(msg.content.toString());

        const queueKey = `queue:${doctor_id}`;
        await redis.zrem(queueKey, patient_name);

        io.to(`doctor_${doctor_id}`).emit("appointmentFinished", {
            patient_name,
            message: `${patient_name} appointment finished`,
        });

        io.to(`doctor_${doctor_id}`).emit("queueUpdated", {
            message: `${patient_name} appointment finished`,
        });

        console.log(`✅ Finished appointment for ${patient_name} with doctor ${doctor_id}`);
        channel.ack(msg);
    });

    console.log("🐇 RabbitMQ consumer started");
}

module.exports = { consumeEvents, connectRabbitMQ, publishEvent };