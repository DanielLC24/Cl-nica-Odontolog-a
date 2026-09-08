import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import pg from "pg";

dotenv.config();

const app = express();
const port = process.env.PORT || 3003;
const databaseUrl = process.env.DATABASE_URL;
const { Pool } = pg;

const pool = new Pool({
  connectionString: databaseUrl
});

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
      if (attempt === retries) {
        throw error;
      }
      console.log(`Waiting for appointments database... attempt ${attempt}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

async function initializeDatabase() {
  await waitForDatabase();

  await query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      patient_name VARCHAR(150) NOT NULL,
      doctor_id INTEGER,
      doctor VARCHAR(150) NOT NULL,
      cubicle_id INTEGER,
      room VARCHAR(100) NOT NULL,
      appointment_date DATE NOT NULL,
      appointment_time TIME NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      observations TEXT NOT NULL DEFAULT '',
      status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMADA',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await query("ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id INTEGER");
  await query("ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cubicle_id INTEGER");

  const existing = await query("SELECT COUNT(*) FROM appointments");
  if (Number(existing.rows[0].count) === 0) {
    await query(
      `INSERT INTO appointments
        (patient_id, patient_name, doctor, room, appointment_date, appointment_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7),
              ($8, $9, $10, $11, $12, $13, $14)`,
      [
        1,
        "Ana Martinez",
        "Dra. Rivera",
        "Cubiculo 1",
        "2026-09-07",
        "10:00",
        "EN_ESPERA",
        2,
        "Carlos Ruiz",
        "Dr. Torres",
        "Cubiculo 2",
        "2026-09-07",
        "12:30",
        "CONFIRMADA"
      ]
    );
  }
}

function mapAppointment(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    doctorId: row.doctor_id,
    doctor: row.doctor,
    cubicleId: row.cubicle_id,
    room: row.room,
    date: row.appointment_date instanceof Date
      ? row.appointment_date.toISOString().slice(0, 10)
      : row.appointment_date,
    time: row.appointment_time,
    reason: row.reason,
    observations: row.observations,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function isValidId(value) {
  return /^\d+$/.test(String(value));
}

function getAppointmentFields(body) {
  return {
    patientId: body.patientId,
    patientName: body.patientName,
    doctorId: body.doctorId || null,
    doctor: body.doctor,
    cubicleId: body.cubicleId || null,
    room: body.room,
    date: body.date,
    time: body.time,
    reason: body.reason || "",
    observations: body.observations || "",
    status: body.status || "CONFIRMADA"
  };
}

function hasRequiredAppointmentFields(fields) {
  return Boolean(
    fields.patientId &&
    fields.patientName &&
    fields.doctor &&
    fields.room &&
    fields.date &&
    fields.time
  );
}

app.get("/health", (_req, res) => {
  res.json({ service: "appointments-service", status: "ok" });
});

app.get("/", async (_req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM appointments ORDER BY appointment_date ASC, appointment_time ASC"
    );
    res.json(result.rows.map(mapAppointment));
  } catch (error) {
    next(error);
  }
});

app.post("/", async (req, res, next) => {
  try {
    const fields = getAppointmentFields(req.body);

    if (!hasRequiredAppointmentFields(fields)) {
      return res.status(400).json({
        message: "Paciente, nombre del paciente, doctor, cubiculo, fecha y hora son obligatorios"
      });
    }

    const result = await query(
      `INSERT INTO appointments
        (patient_id, patient_name, doctor_id, doctor, cubicle_id, room, appointment_date, appointment_time, reason, observations, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        fields.patientId,
        fields.patientName,
        fields.doctorId,
        fields.doctor,
        fields.cubicleId,
        fields.room,
        fields.date,
        fields.time,
        fields.reason,
        fields.observations,
        fields.status
      ]
    );

    res.status(201).json(mapAppointment(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get("/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "El id de la cita debe ser numerico" });
    }

    const result = await query("SELECT * FROM appointments WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    res.json(mapAppointment(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.put("/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "El id de la cita debe ser numerico" });
    }

    const fields = getAppointmentFields(req.body);
    if (!hasRequiredAppointmentFields(fields)) {
      return res.status(400).json({
        message: "Paciente, nombre del paciente, doctor, cubiculo, fecha y hora son obligatorios"
      });
    }

    const result = await query(
      `UPDATE appointments
       SET patient_id = $1,
           patient_name = $2,
           doctor_id = $3,
           doctor = $4,
           cubicle_id = $5,
           room = $6,
           appointment_date = $7,
           appointment_time = $8,
           reason = $9,
           observations = $10,
           status = $11,
           updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        fields.patientId,
        fields.patientName,
        fields.doctorId,
        fields.doctor,
        fields.cubicleId,
        fields.room,
        fields.date,
        fields.time,
        fields.reason,
        fields.observations,
        fields.status,
        req.params.id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    res.json(mapAppointment(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.delete("/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "El id de la cita debe ser numerico" });
    }

    const result = await query("DELETE FROM appointments WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.patch("/:id/status", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id) || !req.body.status) {
      return res.status(400).json({ message: "El id y el estado de la cita son obligatorios" });
    }

    const result = await query(
      `UPDATE appointments
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.body.status, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    res.json(mapAppointment(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Error interno en appointments-service" });
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`appointments-service running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to initialize appointments-service database", error);
    process.exit(1);
  });
