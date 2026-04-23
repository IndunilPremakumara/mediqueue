const amqp = require("amqplib");

let channel;

async function connectRabbitMQ() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
  channel = await connection.createChannel();

  await channel.assertExchange("mediqueue", "topic", {
    durable: true
  });
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

module.exports = { connectRabbitMQ, publishEvent };