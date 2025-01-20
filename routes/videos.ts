import express, { type Request, type Response, type NextFunction } from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import mongoose, { Types } from "mongoose"
import {
  Video,
  User,
  Comment,
  Tip,
  VideoDocument,
  type UserDocument,
  CommentDocument,
  TipDocument,
} from "../models/schemas"
import { verifyToken } from "./users"
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import config from "../config"

const router = express.Router()

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// Configure multer for video upload
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

// Helper function to upload file to S3
async function uploadFileToS3(file: Express.Multer.File, key: string) {
  key = key.replace(/^\//, "") // Remove leading slash if present
  console.log(`Attempting to upload file to S3. Key: ${key}, File name: ${file.originalname}, Size: ${file.size} bytes`)
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }

  const command = new PutObjectCommand(params)
  try {
    await s3Client.send(command)
    const url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    console.log(`File uploaded successfully to S3. URL: ${url}`)
    return url
  } catch (error) {
    if (error instanceof S3ServiceException) {
      console.error("S3 Error:", {
        message: error.message,
        name: error.name,
        $metadata: error.$metadata,
      })
    } else {
      console.error("Unknown error during upload:", error)
    }
    throw error // Re-throw the error to be handled by your error middleware
  }
}

// POST route to handle video upload
router.post("/", verifyToken, upload.single("video"), async (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) {
      console.log("No video file uploaded")
      return res.status(400).json({ message: "No video file uploaded" })
    }

    console.log(`Received video upload request. File name: ${file.originalname}, Size: ${file.size} bytes`)

    const { title, description, privacy } = req.body
    const userId = (req as any).userId

    // Upload video to S3
    const videoKey = `videos/${Date.now()}-${file.originalname}`.replace(/^\//, "")
    console.log(`Uploading video to S3. Key: ${videoKey}`)
    const videoUrl = await uploadFileToS3(file, videoKey)
    console.log(`Video uploaded successfully. URL: ${videoUrl}`)

    // Generate and upload thumbnail
    const thumbnailKey = `thumbnails/${Date.now()}-${path.parse(file.originalname).name}.jpg`.replace(/^\//, "")
    console.log(`Uploading thumbnail to S3. Key: ${thumbnailKey}`)
    const thumbnailUrl = await uploadFileToS3(file, thumbnailKey)
    console.log(`Thumbnail uploaded successfully. URL: ${thumbnailUrl}`)

    const video = new Video({
      title,
      description,
      url: videoUrl,
      thumbnail: thumbnailUrl,
      user: userId,
      privacy: privacy || "public",
    })

    console.log(`Saving video document to database. Title: ${title}, User: ${userId}`)
    const savedVideo = await video.save()
    console.log(`Video document saved successfully. ID: ${savedVideo._id}, URL: ${savedVideo.url}`)

    await User.findByIdAndUpdate(userId, { $inc: { uploadedVideosCount: 1 } })
    console.log(`Updated user's uploadedVideosCount. User ID: ${userId}`)

    res.status(201).json(savedVideo)
  } catch (error) {
    console.error("Error uploading video:", error)
    res.status(500).json({ message: "Server error while uploading video" })
  }
})

// GET route to fetch videos for a specific user
router.get("/user/:userId", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId
    const videos = await Video.find({ user: new Types.ObjectId(userId) }).sort({ createdAt: -1 })
    res.json(videos)
  } catch (error) {
    console.error("Error fetching user videos:", error)
    res.status(500).json({ message: "Server error while fetching user videos" })
  }
})

// GET route to fetch all videos (public)
router.get("/", async (req: Request, res: Response) => {
  try {
    const s3BucketUrl = `https://${config.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`
    const videos = await Video.find({ privacy: "public" })
      .populate("user", "username displayName avatar")
      .sort({ createdAt: -1 })

    const videosWithFullUrls = videos.map((video) => ({
      ...video.toObject(),
      url: `${s3BucketUrl}/${video._id}/stream`,
      thumbnail: `${s3BucketUrl}/${video._id}/thumbnail`,
    }))

    res.json(videosWithFullUrls)
  } catch (error) {
    console.error("Error fetching videos:", error)
    res.status(500).json({ message: "Server error while fetching videos" })
  }
})

// GET route to fetch a specific video
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.id).populate("user", "username displayName avatar")
    if (!video) {
      return res.status(404).json({ message: "Video not found" })
    }
    res.json(video)
  } catch (error) {
    console.error("Error fetching video:", error)
    res.status(500).json({ message: "Server error while fetching video" })
  }
})

// GET route to serve video thumbnail
router.get("/:id/thumbnail", async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.id)
    if (!video || !video.thumbnail) {
      return res.status(404).json({ message: "Thumbnail not found" })
    }

    // Redirect to the S3 URL
    res.redirect(video.thumbnail)
  } catch (error) {
    console.error("Error serving thumbnail:", error)
    res.status(500).json({ message: "Server error while serving thumbnail" })
  }
})

// Like/Unlike video
router.post("/:id/like", verifyToken, async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id
    const userId = (req as any).userId

    const video = await Video.findById(videoId)
    if (!video) {
      return res.status(404).json({ message: "Video not found" })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const likedIndex = video.likes.findIndex((id) => id.equals(new Types.ObjectId(userId)))
    if (likedIndex === -1) {
      // Like the video
      video.likes.push(new Types.ObjectId(userId))
      if (!user.likedVideos) {
        user.likedVideos = []
      }
      user.likedVideos.push(new Types.ObjectId(videoId))
    } else {
      // Unlike the video
      video.likes.splice(likedIndex, 1)
      if (user.likedVideos) {
        user.likedVideos = user.likedVideos.filter((id) => !id.equals(new Types.ObjectId(videoId)))
      }
    }

    await video.save()
    await user.save()

    res.json({ likes: video.likes.length, isLiked: likedIndex === -1 })
  } catch (error) {
    console.error("Error liking/unliking video:", error)
    res.status(500).json({ message: "Server error while processing like/unlike" })
  }
})

// Add a comment to a video
router.post("/:id/comment", verifyToken, async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id
    const userId = (req as any).userId
    const { content } = req.body

    const video = await Video.findById(videoId)
    if (!video) {
      return res.status(404).json({ message: "Video not found" })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const newComment = new Comment({
      content,
      user: new Types.ObjectId(userId),
      video: new Types.ObjectId(videoId),
    })

    await newComment.save()

    video.comments.push(newComment._id as unknown as Types.ObjectId)
    await video.save()

    const populatedComment = await Comment.findById(newComment._id).populate("user", "username displayName avatar")

    res.status(201).json({
      comment: populatedComment,
      commentCount: video.comments.length,
    })
  } catch (error) {
    console.error("Error adding comment:", error)
    res.status(500).json({ message: "Server error while adding comment" })
  }
})

// Get comments for a video
router.get("/:id/comments", async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id

    const comments = await Comment.find({ video: new Types.ObjectId(videoId) })
      .populate("user", "username displayName avatar")
      .sort({ createdAt: -1 })

    res.json(comments)
  } catch (error) {
    console.error("Error fetching comments:", error)
    res.status(500).json({ message: "Server error while fetching comments" })
  }
})

// Delete a comment
router.delete("/:id/comments/:commentId", verifyToken, async (req: Request, res: Response) => {
  try {
    const { id: videoId, commentId } = req.params
    const userId = (req as any).userId

    const comment = await Comment.findById(commentId)
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" })
    }

    if (!comment.user.equals(userId)) {
      return res.status(403).json({ message: "You are not authorized to delete this comment" })
    }

    await Comment.findByIdAndDelete(commentId)

    const video = await Video.findById(videoId)
    if (video) {
      video.comments = video.comments.filter((id: Types.ObjectId) => !id.equals(new Types.ObjectId(commentId)))
      await video.save()
    }

    res.json({ message: "Comment deleted successfully" })
  } catch (error) {
    console.error("Error deleting comment:", error)
    res.status(500).json({ message: "Server error while deleting comment" })
  }
})

// GET route to fetch liked videos for a user
router.get("/liked/:userId", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const likedVideos = await Video.find({ _id: { $in: user.likedVideos } })
      .populate("user", "username displayName avatar")
      .sort({ createdAt: -1 })

    res.json(likedVideos)
  } catch (error) {
    console.error("Error fetching liked videos:", error)
    res.status(500).json({ message: "Server error while fetching liked videos" })
  }
})

// DELETE route to delete a video
router.delete("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id
    const userId = (req as any).userId

    console.log("Attempting to delete video:", videoId)
    console.log("User ID:", userId)

    const video = await Video.findById(videoId)
    if (!video) {
      console.log("Video not found:", videoId)
      return res.status(404).json({ message: "Video not found" })
    }

    console.log("Video found:", video)

    if (video.user.toString() !== userId) {
      console.log("Unauthorized deletion attempt. Video user:", video.user, "Request user:", userId)
      return res.status(403).json({ message: "You are not authorized to delete this video" })
    }

    // Delete the video file from S3
    const videoKey = new URL(video.url).pathname.slice(1) // Remove leading '/'
    const deleteVideoCommand = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: videoKey,
    })
    await s3Client.send(deleteVideoCommand)

    // Delete the thumbnail from S3
    const thumbnailKey = new URL(video.thumbnail).pathname.slice(1) // Remove leading '/'
    const deleteThumbnailCommand = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: thumbnailKey,
    })
    await s3Client.send(deleteThumbnailCommand)

    // Delete the video document
    const deletedVideo = await Video.findByIdAndDelete(videoId)
    console.log("Video document deleted:", deletedVideo)

    // Remove video reference from user's likedVideos
    const updateResult = await User.updateMany({ likedVideos: videoId }, { $pull: { likedVideos: videoId } })
    console.log("Users updated:", updateResult)

    // Delete all comments associated with the video
    const deleteCommentsResult = await Comment.deleteMany({ video: videoId })
    console.log("Comments deleted:", deleteCommentsResult)

    await User.findByIdAndUpdate(userId, { $inc: { uploadedVideosCount: -1 } })
    console.log("Updated user video count")
    res.json({ message: "Video deleted successfully" })
  } catch (error) {
    console.error("Error deleting video:", error)
    res.status(500).json({ message: "Server error while deleting video" })
  }
})

// Add tip to a video
router.post("/:id/tip", verifyToken, async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id
    const senderId = (req as any).userId
    const { amount } = req.body

    // Validate amount
    if (!amount || amount < 1) {
      return res.status(400).json({ message: "Invalid tip amount" })
    }

    const video = await Video.findById(videoId).populate("user", "_id tokenBalance")
    if (!video) {
      return res.status(404).json({ message: "Video not found" })
    }

    const sender = await User.findById(senderId)
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" })
    }

    // Check if sender has enough tokens
    if (sender.tokenBalance < amount) {
      return res.status(400).json({ message: "Insufficient tokens" })
    }

    const receiverId = (video.user as UserDocument)._id

    // Create tip record
    const tip = new Tip({
      sender: senderId,
      receiver: receiverId,
      video: videoId,
      amount,
      createdAt: new Date(),
    })

    // Update token balances
    sender.tokenBalance -= amount
    await User.findByIdAndUpdate(receiverId, {
      $inc: { tokenBalance: amount },
    })

    // Save changes
    await Promise.all([tip.save(), sender.save()])

    // Return populated tip
    const populatedTip = await Tip.findById(tip._id)
      .populate("sender", "username displayName avatar")
      .populate("receiver", "username displayName avatar")

    res.status(201).json(populatedTip)
  } catch (error) {
    console.error("Error processing tip:", error)
    res.status(500).json({ message: "Server error while processing tip" })
  }
})

// Get tips for a video
router.get("/:id/tips", verifyToken, async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id

    const tips = await Tip.find({ video: videoId })
      .populate("sender", "username displayName avatar")
      .populate("receiver", "username displayName avatar")
      .sort({ createdAt: -1 })

    res.json(tips)
  } catch (error) {
    console.error("Error fetching tips:", error)
    res.status(500).json({ message: "Server error while fetching tips" })
  }
})

// Get tips summary for a video
router.get("/:id/tips/summary", verifyToken, async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id

    const tips = await Tip.find({ video: videoId })
    const totalAmount = tips.reduce((sum, tip) => sum + tip.amount, 0)
    const uniqueSenders = new Set(tips.map((tip) => tip.sender.toString())).size

    res.json({
      totalAmount,
      tipCount: tips.length,
      uniqueSenders,
    })
  } catch (error) {
    console.error("Error fetching tips summary:", error)
    res.status(500).json({ message: "Server error while fetching tips summary" })
  }
})

// GET route to stream video
router.get("/:id/stream", async (req: Request, res: Response) => {
  try {
    console.log(`Received video streaming request. Video ID: ${req.params.id}`)
    const video = await Video.findById(req.params.id)
    if (!video) {
      console.log(`Video not found. ID: ${req.params.id}`)
      return res.status(404).json({ message: "Video not found" })
    }
    console.log(`Video document found. URL: ${video.url}`)

    // Parse the S3 URL to get the key
    const url = new URL(video.url)
    const key = url.pathname.slice(1) // Remove leading slash

    const contentType = "video/mp4" // Adjust this if you have different video formats
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    })
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    })
    const urlWithContentType = `${signedUrl}&response-content-type=${encodeURIComponent(contentType)}`

    console.log(`Generated signed URL for video. URL: ${urlWithContentType}`)

    // Set the Content-Type header
    res.setHeader("Content-Type", contentType)

    // Redirect to the signed URL with content type
    res.redirect(urlWithContentType)
  } catch (error) {
    console.error("Error streaming video:", error)
    res.status(500).json({ message: "Server error while streaming video" })
  }
})

export default router
























































































































































