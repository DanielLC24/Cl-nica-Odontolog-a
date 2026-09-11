import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import pg from "pg";

dotenv.config();

const app = express();
const port = process.env.PORT || 3005;
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
      console.log(`Waiting for billing database... attempt ${attempt}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

async function initializeDatabase() {
  await waitForDatabase();

  await query(`
    CREATE TABLE IF NOT EXISTS treatments (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true
    );
  `);

  await query(`
    ALTER TABLE treatments
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS budgets (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS budget_treatments (
      id SERIAL PRIMARY KEY,
      budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
      treatment_id INTEGER NOT NULL REFERENCES treatments(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
      amount DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const existing = await query("SELECT COUNT(*) FROM treatments");
  if (Number(existing.rows[0].count) === 0) {
    await query(
      `INSERT INTO treatments (name, price) VALUES ($1, $2), ($3, $4), ($5, $6)`,
      [
        "Limpieza dental",
        600,
        "Resina",
        850,
        "Endodoncia",
        3200
      ]
    );
  }
}

function isValidId(id) {
  return !Number.isNaN(Number(id)) && Number(id) > 0;
}

app.get("/health", (_req, res) => {
  res.json({ service: "billing-service", status: "ok" });
});

app.get("/treatments", async (_req, res, next) => {
  try {
    const result = await query("SELECT * FROM treatments WHERE active = true ORDER BY id ASC");
    res.json(result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price)
    })));
  } catch (error) {
    next(error);
  }
});

app.post("/treatments", async (req, res, next) => {
  try {
    const { name, price } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ message: "name es requerido" });
    }

    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ message: "price es requerido y debe ser mayor a 0" });
    }

    const result = await query(
      "INSERT INTO treatments (name, price) VALUES ($1, $2) RETURNING *",
      [name.trim(), priceNum]
    );

    res.status(201).json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      price: Number(result.rows[0].price)
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/treatments/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "El id del tratamiento debe ser numérico" });
    }

    const treatmentResult = await query(
      "SELECT * FROM treatments WHERE id = $1",
      [req.params.id]
    );

    if (treatmentResult.rowCount === 0) {
      return res.status(404).json({ message: "Tratamiento no encontrado" });
    }

    await query(
      "UPDATE treatments SET active = false WHERE id = $1",
      [req.params.id]
    );

    res.json({ message: "Tratamiento desactivado correctamente" });
  } catch (error) {
    next(error);
  }
});

app.get("/budgets", async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        b.id,
        b.patient_id as "patientId",
        b.total,
        b.paid,
        b.status,
        COALESCE(b.total - b.paid, 0) as balance,
        COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name, 'price', t.price)) 
          FILTER (WHERE t.id IS NOT NULL), '[]'::json) as treatments
      FROM budgets b
      LEFT JOIN budget_treatments bt ON b.id = bt.budget_id
      LEFT JOIN treatments t ON bt.treatment_id = t.id
      GROUP BY b.id, b.patient_id, b.total, b.paid, b.status
      ORDER BY b.id DESC
    `);
    
    res.json(result.rows.map((row) => ({
      id: row.id,
      patientId: row.patientId,
      total: Number(row.total),
      paid: Number(row.paid),
      balance: Number(row.balance),
      status: row.status,
      treatments: row.treatments
    })));
  } catch (error) {
    next(error);
  }
});

app.post("/budgets", async (req, res, next) => {
  try {
    const { patientId, treatments: treatmentIds } = req.body;

    if (!patientId || !treatmentIds || treatmentIds.length === 0) {
      return res.status(400).json({ message: "patientId y treatments son requeridos" });
    }

    const treatmentsResult = await query(
      "SELECT id, price FROM treatments WHERE id = ANY($1::integer[])",
      [treatmentIds]
    );

    if (treatmentsResult.rows.length === 0) {
      return res.status(400).json({ message: "No se encontraron tratamientos válidos" });
    }

    const total = treatmentsResult.rows.reduce((sum, row) => sum + Number(row.price), 0);

    const budgetResult = await query(
      "INSERT INTO budgets (patient_id, total, paid, status) VALUES ($1, $2, 0, 'PENDIENTE') RETURNING *",
      [patientId, total]
    );

    const budgetId = budgetResult.rows[0].id;

    for (const treatmentId of treatmentIds) {
      await query(
        "INSERT INTO budget_treatments (budget_id, treatment_id) VALUES ($1, $2)",
        [budgetId, treatmentId]
      );
    }

    res.status(201).json({
      id: budgetId,
      patientId,
      total: Number(total),
      paid: 0,
      balance: Number(total),
      status: "PENDIENTE",
      treatments: treatmentsResult.rows.map((row) => ({
        id: row.id,
        price: Number(row.price)
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.post("/budgets/:id/payments", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "El id del presupuesto debe ser numérico" });
    }

    const amount = Number(req.body.amount || 0);

    if (amount <= 0) {
      return res.status(400).json({ message: "El monto del pago debe ser mayor a 0" });
    }

    const budgetResult = await query(
      "SELECT * FROM budgets WHERE id = $1",
      [req.params.id]
    );

    if (budgetResult.rowCount === 0) {
      return res.status(404).json({ message: "Presupuesto no encontrado" });
    }

    const budget = budgetResult.rows[0];
    const pendingBalance = Number(budget.total) - Number(budget.paid);

    if (amount > pendingBalance) {
      return res.status(400).json({ 
        message: "El monto del pago no puede exceder el saldo pendiente",
        balance: pendingBalance
      });
    }

    await query(
      "INSERT INTO payments (budget_id, amount) VALUES ($1, $2)",
      [req.params.id, amount]
    );

    const newPaid = Number(budget.paid) + amount;
    const newStatus = newPaid >= Number(budget.total) ? "PAGADO" : "PARCIAL";

    await query(
      "UPDATE budgets SET paid = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
      [newPaid, newStatus, req.params.id]
    );

    const treatmentsResult = await query(
      `SELECT t.id, t.name, t.price FROM treatments t
       INNER JOIN budget_treatments bt ON t.id = bt.treatment_id
       WHERE bt.budget_id = $1`,
      [req.params.id]
    );

    res.json({
      id: Number(req.params.id),
      patientId: budget.patient_id,
      total: Number(budget.total),
      paid: newPaid,
      balance: Number(budget.total) - newPaid,
      status: newStatus,
      treatments: treatmentsResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        price: Number(row.price)
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.listen(port, async () => {
  try {
    await initializeDatabase();
    console.log(`billing-service running on port ${port}`);
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }
});
