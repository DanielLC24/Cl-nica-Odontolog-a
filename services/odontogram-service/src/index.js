import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";

dotenv.config();

const app = express();
const port = process.env.PORT || 3004;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

const odontograms = {
  1: [
    { toothId: "11", status: "SANO", notes: "" },
    { toothId: "12", status: "CARIES", notes: "Caries superficial" },
    { toothId: "26", status: "ENDODONCIA", notes: "Pendiente de tratamiento" }
  ],
  2: [
    { toothId: "31", status: "SANO", notes: "" },
    { toothId: "46", status: "EXTRACCION", notes: "Extraccion previa" }
  ]
};

app.get("/health", (_req, res) => {
  res.json({ service: "odontogram-service", status: "ok" });
});

app.get("/patient/:patientId", (req, res) => {
  res.json(odontograms[req.params.patientId] || []);
});

app.put("/patient/:patientId/tooth/:toothId", (req, res) => {
  const { patientId, toothId } = req.params;
  odontograms[patientId] = odontograms[patientId] || [];

  const existing = odontograms[patientId].find((item) => item.toothId === toothId);
  if (existing) {
    Object.assign(existing, req.body);
    return res.json(existing);
  }

  const tooth = { toothId, status: req.body.status || "SANO", notes: req.body.notes || "" };
  odontograms[patientId].push(tooth);
  res.status(201).json(tooth);
});

app.listen(port, () => {
  console.log(`odontogram-service running on port ${port}`);
});
