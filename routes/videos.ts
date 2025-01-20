import express, { type Request, type Response, type NextFunction } from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import mongoose, { Types, ObjectId } from "mongoose"
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
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

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
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }

  const command = new PutObjectCommand(params)
  await s3Client.send(command)

  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
}

// POST route to handle video upload
router.post("/", verifyToken, upload.single("video"), async (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ message: "No video file uploaded" })
    }

    const { title, description, privacy } = req.body
    const userId = (req as any).userId

    // Upload video to S3
    const videoKey = `videos/${Date.now()}-${file.originalname}`
    const videoUrl = await uploadFileToS3(file, videoKey)

    // Generate and upload thumbnail
    // Note: For this example, we're using the first frame of the video as a thumbnail.
    // In a production environment, you might want to use a library like ffmpeg to generate a proper thumbnail.
    const thumbnailKey = `thumbnails/${Date.now()}-${path.parse(file.originalname).name}.jpg`
    const thumbnailUrl = await uploadFileToS3(file, thumbnailKey)

    const video = new Video({
      title,
      description,
      url: videoUrl, // Store the full S3 URL
      thumbnail: thumbnailUrl, // Store the full S3 URL
      user: userId,
      privacy: privacy || "public",
    })

    const savedVideo = await video.save()
    await User.findByIdAndUpdate(userId, { $inc: { uploadedVideosCount: 1 } })

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
    const videos = await Video.find({ privacy: "public" })
      .populate("user", "username displayName avatar")
      .sort({ createdAt: -1 })
    res.json(videos)
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
    const video = await Video.findById(req.params.id)
    if (!video) {
      return res.status(404).json({ message: "Video not found" })
    }

    // Check if the video.url is already a full URL
    let videoUrl: URL
    try {
      videoUrl = new URL(video.url)
    } catch {
      // If video.url is not a valid URL, assume it's a key and construct the S3 URL
      videoUrl = new URL(
        `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${video.url}`,
      )
    }

    // Get a signed URL for the video
    const s3Params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: videoUrl.pathname.slice(1), // Remove leading '/'
    }

    const command = new GetObjectCommand(s3Params)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    // Redirect to the signed URL
    res.redirect(signedUrl)
  } catch (error: unknown) {
    console.error("Error streaming video:", error)
    res.status(500).json({
      message: "Server error while streaming video",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "An unexpected error occurred",
    })
  }
})

export default router
































































































































