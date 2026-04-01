const express = require("express");
const userController = require("../controllers/user.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);
router.get("/", requireAdmin, userController.getAllUsers);
router.get("/:id", requireAdmin, userController.getUserById);
router.post("/", requireAdmin, userController.createUser);
router.put("/:id", requireAdmin, userController.updateUser);
router.delete("/:id", requireAdmin, userController.deleteUser);

module.exports = router;
