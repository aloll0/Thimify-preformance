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
const MONGODB_URI = process.env.MONGODB_URI;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
let isMongoConnected = false;

const corsOptions = {
  origin(origin, callback) {
    if (CORS_ORIGIN === "*") {
      callback(null, true);
      return;
    }

    const allowedOrigins = CORS_ORIGIN.split(",").map((value) => value.trim());

    // Allow non-browser requests (no Origin header) like health checks.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
};

app.use(cors(corsOptions));
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

async function connectToDatabase() {
  if (isMongoConnected || mongoose.connection.readyState === 1) {
    return;
  }

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  await mongoose.connect(MONGODB_URI);
  isMongoConnected = true;
}

async function start() {
  try {
    await connectToDatabase();
    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start API server:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = {
  app,
  connectToDatabase,
};
