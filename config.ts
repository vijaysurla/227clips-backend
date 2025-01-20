import dotenv from "dotenv"

dotenv.config()

export default {
  sessionSecret: process.env.SESSION_SECRET || "fallback_secret_key_for_development",
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret_key_for_development",
  piNetwork: {
    platformApiUrl: process.env.PLATFORM_API_URL || "https://api.minepi.com",
    apiKey: process.env.PI_API_KEY,
  },
  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost/piclips",
    username: process.env.MONGODB_USERNAME,
    password: process.env.MONGODB_PASSWORD,
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  port: process.env.PORT || 5000,
  environment: process.env.NODE_ENV || "development",
  S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || "your-default-bucket-name",
}

















