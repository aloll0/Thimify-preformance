const { app, connectToDatabase } = require("../server/index");

module.exports = async (req, res) => {
  try {
    if (req.url === "/api/health" || req.url === "/health") {
      return res.status(200).json({ status: "ok", service: "api" });
    }

    await connectToDatabase();
    return app(req, res);
  } catch (error) {
    console.error("Serverless API error:", error);
    return res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "production" ? "internal_error" : error.message,
    });
  }
};
