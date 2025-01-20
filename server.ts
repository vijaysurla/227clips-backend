import express from "express"
import searchRoutes from "./routes/search.js"
import cors from "cors"
import mongoose from "mongoose"
import session from "express-session"
import MongoStore from "connect-mongo"
import config from "./config.js"
import userRoutes from "./routes/users.js"
import videoRoutes from "./routes/videos.js"
import { User } from "./models/schemas.js"
import path from "path"
import { fileURLToPath } from "url"
import { S3Client } from "@aws-sdk/client-s3"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Connect to MongoDB
mongoose
  .connect(config.mongodb.uri, {
    user: config.mongodb.username,
    pass: config.mongodb.password,
    dbName: "piclips",
  })
  .then(() => {
    console.log("Connected to MongoDB")
    const dbName = mongoose.connection.db?.databaseName
    console.log("Database:", dbName || "Unknown")
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err)
    process.exit(1)
  })

// CORS configuration
app.use(
  cors({
    origin: [config.frontendUrl, "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

// Body parser configuration with increased limits
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")))

// Ensure session secret is set
if (!config.sessionSecret) {
  console.error("SESSION_SECRET is not set in the environment variables")
  process.exit(1)
}

// Session configuration with MongoStore
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: config.mongodb.uri,
      dbName: "piclips",
      collectionName: "sessions",
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
)

// Increase timeout for requests
app.use((req, res, next) => {
  res.setTimeout(300000, () => {
    console.log("Request has timed out.")
    res.status(408).send("Request has timed out.")
  })
  next()
})

// Root route handler
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the PiClips API" })
})

// Database connection test route
app.get("/api/db-test", async (req, res) => {
  try {
    if (!mongoose.connection.db) {
      throw new Error("Database connection not established")
    }
    await mongoose.connection.db.admin().ping()
    res.json({
      message: "Successfully connected to MongoDB",
      database: mongoose.connection.db.databaseName,
    })
  } catch (error) {
    console.error("Database connection test failed:", error)
    res.status(500).json({
      message: "Failed to connect to MongoDB",
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// Test S3 connection
s3Client.config.credentials().then(
  () => console.log("Successfully connected to AWS"),
  (err) => console.error("Failed to connect to AWS", err),
)

// Routes
app.use("/api/users", userRoutes)
app.use("/api/videos", videoRoutes)
app.use("/api/search", searchRoutes)

// 404 Not Found handler
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" })
})

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global error:", err)
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  })
})

const PORT = config.port || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app



































































