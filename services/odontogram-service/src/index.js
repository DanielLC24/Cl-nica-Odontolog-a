import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import pg from "pg";

dotenv.config();

const app = express();
const port = process.env.PORT || 3004;
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
      console.log(`Waiting for odontogram database... attempt ${attempt}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

async function initializeDatabase() {
  await waitForDatabase();

  await query(`
    CREATE TABLE IF NOT EXISTS tooth_states (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      tooth_id VARCHAR(10) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'SANO',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (patient_id, tooth_id)
    );
  `);

  const existing = await query("SELECT COUNT(*) FROM tooth_states");
  if (Number(existing.rows[0].count) === 0) {
    await query(
      `INSERT INTO tooth_states (patient_id, tooth_id, status, notes)
       VALUES
        ($1, $2, $3, $4),
        ($5, $6, $7, $8),
        ($9, $10, $11, $12),
        ($13, $14, $15, $16),
        ($17, $18, $19, $20)`,
      [
        1,
        "11",
        "SANO",
        "",
        1,
        "12",
        "CARIES",
        "Caries superficial",
        1,
        "26",
        "ENDODONCIA",
        "Pendiente de tratamiento",
        2,
        "31",
        "SANO",
        "",
        2,
        "46",
        "EXTRACCION",
        "Extraccion previa"
      ]
    );
  }
}

function mapToothState(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    toothId: row.tooth_id,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

app.get("/health", async (_req, res, next) => {
  try {
    await query("SELECT 1");
    res.json({ service: "odontogram-service", status: "ok" });
  } catch (error) {
    next(error);
  }
});

app.get("/patient/:patientId", async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM tooth_states WHERE patient_id = $1 ORDER BY tooth_id ASC",
      [req.params.patientId]
    );
    res.json(result.rows.map(mapToothState));
  } catch (error) {
    next(error);
  }
});

app.put("/patient/:patientId/tooth/:toothId", async (req, res, next) => {
  try {
    const { patientId, toothId } = req.params;
    const status = req.body.status || "SANO";
    const notes = req.body.notes || "";

    const result = await query(
      `INSERT INTO tooth_states (patient_id, tooth_id, status, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (patient_id, tooth_id)
       DO UPDATE SET
         status = EXCLUDED.status,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING *`,
      [patientId, toothId, status, notes]
    );

    res.json(mapToothState(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Error interno en odontogram-service" });
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`odontogram-service running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to initialize odontogram-service database", error);
    process.exit(1);
  });
