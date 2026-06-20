const amqp = require("amqplib");
const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL);

async function startConsumer(io) {
  const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
  const channel = await connection.createChannel();

  await channel.assertExchange("mediqueue", "topic", { durable: true });

  // appointment.booked → add to Redis queue + notify doctor
  const bookedQueue = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(bookedQueue.queue, "mediqueue", "appointment.booked");

  channel.consume(bookedQueue.queue, async (msg) => {
    if (!msg) return;
    const { doctor_id, patient_name } = JSON.parse(msg.content.toString());

    const queueKey = `queue:${doctor_id}`;
    await redis.zadd(queueKey, Date.now(), patient_name);

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

  console.log("🐇 RabbitMQ consumer started");
}

module.exports = { startConsumer };