import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const routes = [
  ["/api/auth", process.env.AUTH_SERVICE_URL || "http://localhost:3001"],
  ["/api/patients", process.env.PATIENTS_SERVICE_URL || "http://localhost:3002"],
  ["/api/appointments", process.env.APPOINTMENTS_SERVICE_URL || "http://localhost:3003"],
  ["/api/odontogram", process.env.ODONTOGRAM_SERVICE_URL || "http://localhost:3004"],
  ["/api/billing", process.env.BILLING_SERVICE_URL || "http://localhost:3005"],
  ["/api/doctors", process.env.DOCTORS_SERVICE_URL || "http://localhost:3006"]
];

app.use(cors());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ service: "api-gateway", status: "ok" });
});

for (const [path, target] of routes) {
  app.use(
    path,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: { [`^${path}`]: "" },
      on: { proxyReq: fixRequestBody }
    })
  );
}

app.use(express.json());

app.listen(port, () => {
  console.log(`api-gateway running on port ${port}`);
});
