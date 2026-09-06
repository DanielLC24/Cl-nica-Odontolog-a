import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import pg from "pg";

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;
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
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.log(`Waiting for patients database... attempt ${attempt}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

async function initializeDatabase() {
  await waitForDatabase();

  await query(`
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      email VARCHAR(120),
      birth_date DATE,
      address TEXT,
      medical_alerts TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS clinical_records (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      reason_for_visit TEXT,
      diagnosis TEXT,
      observations TEXT,
      allergies TEXT,
      chronic_conditions TEXT,
      current_medications TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const existing = await query("SELECT COUNT(*) FROM patients");
  if (Number(existing.rows[0].count) === 0) {
    const firstPatient = await query(
      `INSERT INTO patients (full_name, phone, email, birth_date, address, medical_alerts)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        "Ana Martinez",
        "555-0101",
        "ana.martinez@demo.test",
        "1995-03-12",
        "Colonia Centro",
        ["Alergia a penicilina"]
      ]
    );

    const secondPatient = await query(
      `INSERT INTO patients (full_name, phone, email, birth_date, address, medical_alerts)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        "Carlos Ruiz",
        "555-0188",
        "carlos.ruiz@demo.test",
        "1988-08-21",
        "Av. Universidad",
        ["Hipertension"]
      ]
    );

    await query(
      `INSERT INTO clinical_records
        (patient_id, reason_for_visit, diagnosis, observations, allergies, chronic_conditions, current_medications)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7),
        ($8, $9, $10, $11, $12, $13, $14)`,
      [
        firstPatient.rows[0].id,
        "Dolor en molar superior",
        "Probable endodoncia",
        "Paciente requiere radiografia antes de tratamiento.",
        "Penicilina",
        "",
        "",
        secondPatient.rows[0].id,
        "Revision periodontal",
        "Gingivitis leve",
        "Control recomendado cada 6 meses.",
        "",
        "Hipertension",
        "Losartan"
      ]
    );
  }
}

function mapPatient(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    birthDate: row.birth_date,
    address: row.address,
    medicalAlerts: row.medical_alerts || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapClinicalRecord(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    patientId: row.patient_id,
    reasonForVisit: row.reason_for_visit,
    diagnosis: row.diagnosis,
    observations: row.observations,
    allergies: row.allergies,
    chronicConditions: row.chronic_conditions,
    currentMedications: row.current_medications,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

app.get("/health", async (_req, res, next) => {
  try {
    await query("SELECT 1");
    res.json({ service: "patients-service", status: "ok" });
  } catch (error) {
    next(error);
  }
});

app.get("/", async (_req, res, next) => {
  try {
    const result = await query("SELECT * FROM patients ORDER BY id ASC");
    res.json(result.rows.map(mapPatient));
  } catch (error) {
    next(error);
  }
});

app.post("/", async (req, res, next) => {
  try {
    const { fullName, phone, email, birthDate, address, medicalAlerts = [] } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ message: "Nombre completo y telefono son obligatorios" });
    }

    const result = await query(
      `INSERT INTO patients (full_name, phone, email, birth_date, address, medical_alerts)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [fullName, phone, email || null, birthDate || null, address || null, medicalAlerts]
    );

    await query(
      `INSERT INTO clinical_records (patient_id, reason_for_visit, diagnosis, observations, allergies, chronic_conditions, current_medications)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [result.rows[0].id, "", "", "", "", "", ""]
    );

    res.status(201).json(mapPatient(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get("/:id", async (req, res, next) => {
  try {
    const patient = await query("SELECT * FROM patients WHERE id = $1", [req.params.id]);
    if (patient.rowCount === 0) {
      return res.status(404).json({ message: "Paciente no encontrado" });
    }

    const record = await query("SELECT * FROM clinical_records WHERE patient_id = $1 ORDER BY id DESC LIMIT 1", [req.params.id]);
    res.json({ ...mapPatient(patient.rows[0]), clinicalRecord: mapClinicalRecord(record.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.put("/:id", async (req, res, next) => {
  try {
    const { fullName, phone, email, birthDate, address, medicalAlerts = [] } = req.body;

    const result = await query(
      `UPDATE patients
       SET full_name = $1,
           phone = $2,
           email = $3,
           birth_date = $4,
           address = $5,
           medical_alerts = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [fullName, phone, email || null, birthDate || null, address || null, medicalAlerts, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Paciente no encontrado" });
    }

    res.json(mapPatient(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.put("/:id/clinical-record", async (req, res, next) => {
  try {
    const { reasonForVisit, diagnosis, observations, allergies, chronicConditions, currentMedications } = req.body;

    const result = await query(
      `UPDATE clinical_records
       SET reason_for_visit = $1,
           diagnosis = $2,
           observations = $3,
           allergies = $4,
           chronic_conditions = $5,
           current_medications = $6,
           updated_at = NOW()
       WHERE patient_id = $7
       RETURNING *`,
      [
        reasonForVisit || "",
        diagnosis || "",
        observations || "",
        allergies || "",
        chronicConditions || "",
        currentMedications || "",
        req.params.id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Expediente no encontrado" });
    }

    res.json(mapClinicalRecord(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.delete("/:id", async (req, res, next) => {
  try {
    const result = await query("DELETE FROM patients WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Paciente no encontrado" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Error interno en patients-service" });
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`patients-service running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to initialize patients-service database", error);
    process.exit(1);
  });
