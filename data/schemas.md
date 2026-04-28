## MongoDB — Users Collection
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (bcrypt hashed),
  role: String (patient | doctor | admin),
  createdAt: Date
}

## PostgreSQL — Appointments Table
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  patient_name VARCHAR(255) NOT NULL,
  doctor_id VARCHAR(255) NOT NULL,
  appointment_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'booked',
  created_at TIMESTAMP DEFAULT NOW()
);

## Redis — Queue Structure
Key:   queue:{doctor_id}        (Sorted Set)
Value: patient_name
Score: timestamp (join time)

Key:   queue:{doctor_id}:meta:{patient_name}  (Hash)
Field: time → appointment time
