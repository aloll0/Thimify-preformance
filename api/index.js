const { app, connectToDatabase } = require("../server/index");

module.exports = async (req, res) => {
  try {
    await connectToDatabase();
    return app(req, res);
  } catch (error) {
    console.error("Serverless API error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
