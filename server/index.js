const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

dotenv.config({ path: path.join(__dirname, ".env") });

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/users.routes");
const teamRoutes = require("./routes/teams.routes");
const employeeRoutes = require("./routes/employees.routes");
const evaluationRoutes = require("./routes/evaluations.routes");
const aiRoutes = require("./routes/ai.routes");

const app = express();
const PORT = Number(process.env.PORT || 5000);
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/employee-evaluation";

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/evaluations", evaluationRoutes);
app.use("/api/ai", aiRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled server error:", error);
  res.status(500).json({ message: "Server error" });
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start API server:", error.message);
    process.exit(1);
  }
}

start();
