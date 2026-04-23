const amqp = require("amqplib");

async function consumeEvents() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
  const channel = await connection.createChannel();

  await channel.assertExchange("mediqueue", "topic", { durable: true });
  const q = await channel.assertQueue("notifications", { durable: true });
  
  await channel.bindQueue(q.queue, "mediqueue", "appointment.booked");
  
  console.log("Notification Service started, waiting for events...");

  channel.consume(q.queue, (msg) => {
    const data = JSON.parse(msg.content.toString());
    console.log(`[Notification] Alerting ${data.patient_name}: Appointment booked with Doctor ${data.doctor_id}`);
    channel.ack(msg);
  });
}

consumeEvents().catch(console.error);
