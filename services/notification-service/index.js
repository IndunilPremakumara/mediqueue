require("dotenv").config();
const amqp = require("amqplib");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";

// Mock notification functions
function sendEmail(to, subject, body) {
  console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}, Body: ${body}`);
}

function sendSMS(to, message) {
  console.log(`[MOCK SMS] To: ${to}, Message: ${message}`);
}

function sendPushNotification(userId, title, message) {
  console.log(`[MOCK PUSH] User: ${userId}, Title: ${title}, Message: ${message}`);
}

// Notification handlers
function handleAppointmentBooked(data) {
  const { patient_name, doctor_name, appointment_time } = data;
  const patientEmail = `${patient_name.toLowerCase().replace(' ', '.')}@example.com`; // Mock email
  const subject = "Appointment Confirmation";
  const body = `Dear ${patient_name}, your appointment with ${doctor_name} is confirmed for ${appointment_time}.`;
  sendEmail(patientEmail, subject, body);
  sendSMS(patientEmail, `Appointment confirmed with ${doctor_name} at ${appointment_time}`);
}

function handleAppointmentCancelled(data) {
  const { patient_name, doctor_name } = data;
  const patientEmail = `${patient_name.toLowerCase().replace(' ', '.')}@example.com`; // Mock email
  const subject = "Appointment Cancelled";
  const body = `Dear ${patient_name}, your appointment with ${doctor_name} has been cancelled.`;
  sendEmail(patientEmail, subject, body);
  sendSMS(patientEmail, `Appointment cancelled with ${doctor_name}`);
}

function handleQueueUpdate(data) {
  const { patient_id, position, estimated_wait } = data;
  const message = `Your queue position: ${position}, Estimated wait: ${estimated_wait} minutes`;
  sendPushNotification(patient_id, "Queue Update", message);
}

async function startConsumer() {
  let connection;
  let channel;

  try {
    console.log("Connecting to RabbitMQ...");
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Declare exchange
    await channel.assertExchange("mediqueue", "topic", { durable: true });

    // Declare queue
    const queueResult = await channel.assertQueue("notifications", { durable: true });

    // Bind to multiple routing keys
    const routingKeys = [
      "appointment.booked",
      "appointment.cancelled",
      "queue.updated"
    ];

    for (const key of routingKeys) {
      await channel.bindQueue(queueResult.queue, "mediqueue", key);
      console.log(`Bound to routing key: ${key}`);
    }

    console.log("Notification Service started, waiting for events...");

    // Consume messages
    channel.consume(queueResult.queue, (msg) => {
      if (msg) {
        try {
          const data = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;

          console.log(`Received event: ${routingKey}`, data);

          // Route to appropriate handler
          switch (routingKey) {
            case "appointment.booked":
              handleAppointmentBooked(data);
              break;
            case "appointment.cancelled":
              handleAppointmentCancelled(data);
              break;
            case "queue.updated":
              handleQueueUpdate(data);
              break;
            default:
              console.log(`Unknown event type: ${routingKey}`);
          }

          channel.ack(msg);
        } catch (error) {
          console.error("Error processing message:", error);
          channel.nack(msg, false, false); // Don't requeue on parse errors
        }
      }
    });

  } catch (error) {
    console.error("Error in notification service:", error);
    setTimeout(startConsumer, 5000); // Retry connection after 5 seconds
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down notification service...');
  if (channel) await channel.close();
  if (connection) await connection.close();
  process.exit(0);
});

startConsumer();
