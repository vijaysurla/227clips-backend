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
  port: Number.parseInt(process.env.PORT || "5000", 10),
  environment: process.env.NODE_ENV || "development",
  s3: {
    bucketName: process.env.AWS_S3_BUCKET_NAME || "your-default-bucket-name",
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  apiUrl: process.env.API_URL || "http://localhost:5000/api",
}



















