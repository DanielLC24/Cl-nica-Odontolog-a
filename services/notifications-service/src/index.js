import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import pg from "pg";

dotenv.config();

const app = express();
const port = process.env.PORT || 3008;
const databaseUrl = process.env.DATABASE_URL;
const appointmentsServiceUrl = process.env.APPOINTMENTS_SERVICE_URL || "http://appointments-service:3003";
const patientsServiceUrl = process.env.PATIENTS_SERVICE_URL || "http://patients-service:3002";
const clinicTimeZone = "America/Mexico_City";
const reminderHoursBefore = Number(process.env.REMINDER_HOURS_BEFORE || 24);
const scanIntervalMs = Number(process.env.NOTIFICATION_SCAN_INTERVAL_MS || 5 * 60 * 1000);
const channels = ["WHATSAPP", "SMS", "EMAIL"];
const { Pool } = pg;

const pool = new Pool({ connectionString: databaseUrl });

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

async function query(text, params = []) {
  return pool.query(text, params);
}

async function waitForDatabase(retries = 20) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await query("SELECT 1");
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      console.log(`Waiting for notifications database... attempt ${attempt}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

async function initializeDatabase() {
  await waitForDatabase();
  await query(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id SERIAL PRIMARY KEY,
      appointment_id INTEGER NOT NULL,
      patient_id INTEGER,
      channel VARCHAR(30) NOT NULL,
      recipient VARCHAR(160),
      status VARCHAR(30) NOT NULL,
      message TEXT NOT NULL,
      scheduled_for TIMESTAMP NOT NULL,
      sent_at TIMESTAMP,
      error TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (appointment_id, channel)
    );
  `);
}

function getClinicDateTimeParts(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: clinicTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date).reduce((parts, part) => {
    parts[part.type] = part.value;
    return parts;
  }, {});
}

function getClinicNowDateTimeKey() {
  const parts = getClinicDateTimeParts();
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00`;
}

function appointmentDateTimeKey(appointment) {
  const date = appointment.date?.slice(0, 10);
  const time = String(appointment.time || "").slice(0, 5);
  return `${date}T${time}:00`;
}

function addHours(dateTimeKey, hours) {
  const date = new Date(`${dateTimeKey}-06:00`);
  date.setHours(date.getHours() + hours);
  return date.toISOString().slice(0, 19);
}

function formatAppointmentMessage(appointment) {
  return `Recordatorio: ${appointment.patientName}, tienes una cita dental el ${appointment.date?.slice(0, 10)} a las ${String(appointment.time).slice(0, 5)} con ${appointment.doctor || "tu doctor"}.`;
}

function recipientForChannel(channel, patient) {
  if (channel === "EMAIL") return patient?.email || "";
  return patient?.phone || "";
}

function mapLog(row) {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    patientId: row.patient_id,
    channel: row.channel,
    recipient: row.recipient,
    status: row.status,
    message: row.message,
    scheduledFor: row.scheduled_for,
    sentAt: row.sent_at,
    error: row.error,
    createdAt: row.created_at
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo consultar ${url}`);
  }
  return response.json();
}

async function sendNotification({ channel, recipient, message }) {
  if (!recipient) {
    return { status: "SKIPPED", error: "El paciente no tiene dato de contacto para este canal" };
  }

  console.log(`[mock:${channel}] ${recipient} -> ${message}`);
  return { status: "SENT", error: null };
}

async function saveNotificationLog({ appointment, patient, channel, recipient, status, message, scheduledFor, error }) {
  const sentAt = status === "SENT" ? "NOW()" : "NULL";
  const result = await query(
    `INSERT INTO notification_logs
      (appointment_id, patient_id, channel, recipient, status, message, scheduled_for, sent_at, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, ${sentAt}, $8)
     ON CONFLICT (appointment_id, channel) DO NOTHING
     RETURNING *`,
    [
      appointment.id,
      appointment.patientId || null,
      channel,
      recipient || null,
      status,
      message,
      scheduledFor,
      error
    ]
  );

  return result.rows[0] ? mapLog(result.rows[0]) : null;
}

async function scanDueReminders() {
  const [appointments, patients] = await Promise.all([
    fetchJson(`${appointmentsServiceUrl}/`),
    fetchJson(`${patientsServiceUrl}/`)
  ]);

  const patientById = new Map(patients.map((patient) => [String(patient.id), patient]));
  const nowKey = getClinicNowDateTimeKey();
  const created = [];

  for (const appointment of appointments) {
    if (appointment.status !== "EN_ESPERA") continue;

    const appointmentKey = appointmentDateTimeKey(appointment);
    if (!appointment.date || !appointment.time || appointmentKey <= nowKey) continue;

    const scheduledFor = addHours(appointmentKey, -reminderHoursBefore);
    if (scheduledFor > nowKey) continue;

    const patient = patientById.get(String(appointment.patientId));
    const message = formatAppointmentMessage(appointment);

    for (const channel of channels) {
      const recipient = recipientForChannel(channel, patient);
      const delivery = await sendNotification({ channel, recipient, message });
      const log = await saveNotificationLog({
        appointment,
        patient,
        channel,
        recipient,
        status: delivery.status,
        message,
        scheduledFor,
        error: delivery.error
      });

      if (log) created.push(log);
    }
  }

  return created;
}

app.get("/health", async (_req, res, next) => {
  try {
    await query("SELECT 1");
    res.json({ service: "notifications-service", status: "ok" });
  } catch (error) {
    next(error);
  }
});

app.get("/reminders", async (_req, res, next) => {
  try {
    const result = await query("SELECT * FROM notification_logs ORDER BY created_at DESC, id DESC LIMIT 100");
    res.json(result.rows.map(mapLog));
  } catch (error) {
    next(error);
  }
});

app.get("/summary", async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (WHERE status = 'SENT')::integer AS sent,
        COUNT(*) FILTER (WHERE status = 'SKIPPED')::integer AS skipped,
        COUNT(*) FILTER (WHERE channel = 'WHATSAPP' AND status = 'SENT')::integer AS whatsapp,
        COUNT(*) FILTER (WHERE channel = 'SMS' AND status = 'SENT')::integer AS sms,
        COUNT(*) FILTER (WHERE channel = 'EMAIL' AND status = 'SENT')::integer AS email,
        MAX(sent_at) AS last_sent_at
      FROM notification_logs
    `);
    const row = result.rows[0];
    res.json({
      total: Number(row.total),
      sent: Number(row.sent),
      skipped: Number(row.skipped),
      whatsapp: Number(row.whatsapp),
      sms: Number(row.sms),
      email: Number(row.email),
      lastSentAt: row.last_sent_at
    });
  } catch (error) {
    next(error);
  }
});

app.post("/scan", async (_req, res, next) => {
  try {
    const reminders = await scanDueReminders();
    res.json({ created: reminders.length, reminders });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Error interno en notifications-service" });
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`notifications-service running on port ${port}`);
    });

    setInterval(() => {
      scanDueReminders().catch((error) => console.error("Notification scan failed", error));
    }, scanIntervalMs);

    scanDueReminders().catch((error) => console.error("Initial notification scan failed", error));
  })
  .catch((error) => {
    console.error("Unable to initialize notifications-service database", error);
    process.exit(1);
  });
