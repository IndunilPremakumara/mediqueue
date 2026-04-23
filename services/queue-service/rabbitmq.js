const amqp = require("amqplib");
const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL);

async function consumeEvents(io) {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
    const channel = await connection.createChannel();

    await channel.assertExchange("mediqueue", "topic", { durable: true });

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

        io.to(`doctor_${doctor_id}`).emit("queueUpdated", {
            message: `${patient_name} joined the queue`,
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

module.exports = { consumeEvents };