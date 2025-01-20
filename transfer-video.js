import { MongoClient, ObjectId } from "mongodb"
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const mongoUri = process.env.MONGODB_URI
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const VIDEO_BASE_DIR = path.join(__dirname, "..", "demo", "uploads")
const S3_FOLDER = "videos/"

async function checkS3Object(key) {
  try {
    const command = new HeadObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    })
    await s3Client.send(command)
    return true
  } catch (error) {
    if (error.name === "NotFound") {
      return false
    }
    throw error
  }
}

async function getLocalFiles() {
  return new Promise((resolve, reject) => {
    fs.readdir(VIDEO_BASE_DIR, (err, files) => {
      if (err) reject(err)
      else resolve(files.filter((file) => file.startsWith("video-") && file.endsWith(".mp4")))
    })
  })
}

async function transferVideoToS3() {
  let mongoClient

  try {
    // Connect to MongoDB
    mongoClient = new MongoClient(mongoUri)
    await mongoClient.connect()
    console.log("Connected to MongoDB")

    const db = mongoClient.db("piclips")
    const videosCollection = db.collection("videos")

    // Get list of local video files
    const localFiles = await getLocalFiles()
    console.log("Local video files:", localFiles)

    // Find all video documents
    const videoDocs = await videosCollection.find({ url: { $exists: true } }).toArray()

    if (videoDocs.length === 0) {
      console.log("No videos found in MongoDB")
      return
    }

    console.log(`Found ${videoDocs.length} video documents`)

    for (const videoDoc of videoDocs) {
      console.log(`Processing video document: ${videoDoc._id}`)
      console.log(`Current URL: ${videoDoc.url}`)

      const s3Key = `${S3_FOLDER}${videoDoc._id}.mp4`
      const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`

      // Check if the file already exists in S3
      const existsInS3 = await checkS3Object(s3Key)

      if (existsInS3) {
        console.log(`File already exists in S3: ${s3Key}`)
        if (videoDoc.url !== s3Url) {
          await videosCollection.updateOne({ _id: videoDoc._id }, { $set: { url: s3Url } })
          console.log("Updated MongoDB document with S3 URL")
        }
        continue
      }

      let matchingFile
      if (videoDoc._id.toString() === "678af5d8e9c6b368234980ec") {
        matchingFile = "video-1737160152524-598690547.mp4"
      } else {
        matchingFile = localFiles.find((file) => {
          const [, timestamp] = file.match(/video-(\d+)/) || []
          return (
            timestamp &&
            videoDoc.createdAt &&
            (new Date(Number.parseInt(timestamp)).getTime() === videoDoc.createdAt.getTime() ||
              file.includes(videoDoc._id.toString()))
          )
        })
      }

      if (!matchingFile) {
        console.log(`No matching local file found for video ${videoDoc._id}. Skipping.`)
        continue
      }

      const localFilePath = path.join(VIDEO_BASE_DIR, matchingFile)
      console.log(`Matching file found: ${localFilePath}`)

      const fileContent = fs.readFileSync(localFilePath)

      // Upload to S3
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: s3Key,
        Body: fileContent,
        ContentType: "video/mp4",
      }

      console.log(`Uploading to S3: ${s3Key}`)

      try {
        const uploadCommand = new PutObjectCommand(uploadParams)
        const result = await s3Client.send(uploadCommand)
        console.log("Video uploaded to S3 successfully:", result)

        // Update MongoDB document with new S3 URL
        await videosCollection.updateOne({ _id: videoDoc._id }, { $set: { url: s3Url } })

        console.log("MongoDB document updated with new S3 URL:", s3Url)
      } catch (uploadError) {
        console.error("Error uploading to S3:", uploadError)
      }
    }
  } catch (error) {
    console.error("Error:", error)
  } finally {
    if (mongoClient) {
      await mongoClient.close()
      console.log("MongoDB connection closed")
    }
  }
}

transferVideoToS3()































