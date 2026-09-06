import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";

dotenv.config();

const app = express();
const port = process.env.PORT || 3005;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

const treatments = [
  { id: 1, name: "Limpieza dental", price: 600 },
  { id: 2, name: "Resina", price: 850 },
  { id: 3, name: "Endodoncia", price: 3200 }
];

const budgets = [
  { id: 1, patientId: 1, treatments: [1, 3], total: 3800, paid: 1000, status: "PARCIAL" }
];

app.get("/health", (_req, res) => {
  res.json({ service: "billing-service", status: "ok" });
});

app.get("/treatments", (_req, res) => {
  res.json(treatments);
});

app.get("/budgets", (_req, res) => {
  res.json(budgets);
});

app.post("/budgets", (req, res) => {
  const selectedTreatments = treatments.filter((item) => req.body.treatments?.includes(item.id));
  const total = selectedTreatments.reduce((sum, item) => sum + item.price, 0);
  const budget = { id: budgets.length + 1, paid: 0, status: "PENDIENTE", ...req.body, total };
  budgets.push(budget);
  res.status(201).json(budget);
});

app.post("/budgets/:id/payments", (req, res) => {
  const budget = budgets.find((item) => item.id === Number(req.params.id));
  if (!budget) {
    return res.status(404).json({ message: "Presupuesto no encontrado" });
  }

  budget.paid += Number(req.body.amount || 0);
  budget.status = budget.paid >= budget.total ? "PAGADO" : "PARCIAL";
  res.json({ ...budget, balance: Math.max(budget.total - budget.paid, 0) });
});

app.listen(port, () => {
  console.log(`billing-service running on port ${port}`);
});
