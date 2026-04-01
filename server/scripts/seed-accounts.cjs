const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "team_leader"], required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true },
);

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    teamLeaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

const employeeSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    employeeId: { type: String, unique: true, sparse: true },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    level: {
      type: String,
      enum: ["Fresh", "Implementor", "Maker", "Pro", "Mentor"],
      required: true,
    },
    department: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    joinDate: { type: Date, default: Date.now },
    salary: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);
const Employee =
  mongoose.models.Employee || mongoose.model("Employee", employeeSchema);

const defaultAccounts = [
  {
    email: "admin@demo.com",
    password: "123456",
    role: "admin",
    firstName: "System",
    lastName: "Admin",
  },
  {
    email: "debuger@thimify.com",
    password: "Debuger@123",
    role: "team_leader",
    firstName: "Debuger",
    lastName: "Lead",
  },
  {
    email: "shopify@thimify.com",
    password: "Shopify@123",
    role: "team_leader",
    firstName: "Shopify",
    lastName: "Lead",
  },
  {
    email: "zed@thimify.com",
    password: "Zed@123",
    role: "team_leader",
    firstName: "Zed",
    lastName: "Lead",
  },
  {
    email: "salla@thimify.com",
    password: "Salla@123",
    role: "team_leader",
    firstName: "Salla",
    lastName: "Lead",
  },
  {
    email: "wordpress@thimify.com",
    password: "Wordpress@123",
    role: "team_leader",
    firstName: "Wordpress",
    lastName: "Lead",
  },
  {
    email: "taster@thimify.com",
    password: "Taster@123",
    role: "team_leader",
    firstName: "Taster",
    lastName: "Lead",
  },
  {
    email: "uiux@thimify.com",
    password: "Uiux@123",
    role: "team_leader",
    firstName: "Uiux",
    lastName: "Lead",
  },
];

const teamToLeaderEmail = {
  Debuger: "debuger@thimify.com",
  shopify: "shopify@thimify.com",
  zed: "zed@thimify.com",
  salla: "salla@thimify.com",
  wordpress: "wordpress@thimify.com",
  ui: "uiux@thimify.com",
  tester: "taster@thimify.com",
};

function getMongoUri() {
  const serverEnvPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(serverEnvPath)) {
    return "mongodb://localhost:27017/employee-evaluation";
  }

  const envText = fs.readFileSync(serverEnvPath, "utf8");
  const uriLine = envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("MONGODB_URI="));

  if (!uriLine) {
    return "mongodb://localhost:27017/employee-evaluation";
  }

  return (
    uriLine.slice("MONGODB_URI=".length).trim() ||
    "mongodb://localhost:27017/employee-evaluation"
  );
}

async function seedAccounts() {
  const mongoUri = getMongoUri();
  await mongoose.connect(mongoUri);

  const usersByEmail = {};

  for (const account of defaultAccounts) {
    const hashedPassword = await bcrypt.hash(account.password, 12);

    const user = await User.findOneAndUpdate(
      { email: account.email.toLowerCase() },
      {
        $set: {
          email: account.email.toLowerCase(),
          password: hashedPassword,
          role: account.role,
          firstName: account.firstName,
          lastName: account.lastName,
          isActive: true,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    usersByEmail[user.email] = user;
  }

  for (const [teamName, leaderEmail] of Object.entries(teamToLeaderEmail)) {
    const leader = usersByEmail[leaderEmail.toLowerCase()];
    if (!leader) {
      continue;
    }

    const team = await Team.findOneAndUpdate(
      { name: teamName },
      {
        $set: {
          name: teamName,
          description: `${teamName} team`,
          teamLeaderId: leader._id,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    await Employee.findOneAndUpdate(
      { email: leader.email.toLowerCase() },
      {
        $set: {
          firstName: leader.firstName,
          lastName: leader.lastName,
          email: leader.email.toLowerCase(),
          employeeId: `TL-${teamName.toUpperCase()}`,
          teamId: team._id,
          level: "Mentor",
          department: teamName,
          jobTitle: "Team Leader",
          isActive: true,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  console.log("Default accounts and team leaders seeded successfully.");
  console.log("Accounts:");
  defaultAccounts.forEach((account) => {
    console.log(`- ${account.email} / ${account.password}`);
  });
}

seedAccounts()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seed failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
