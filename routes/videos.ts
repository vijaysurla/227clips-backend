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

const router = express.Router()

// Configure multer for video upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({ storage: storage })

// POST route to handle video upload
router.post("/", verifyToken, (req: Request, res: Response, next: NextFunction) => {
  upload.single("video")(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: "File upload error", error: err.message })
    } else if (err) {
      return res.status(500).json({ message: "Unknown error", error: err.message })
    }

    const file = (req as any).file
    if (!file) {
      return res.status(400).json({ message: "No video file uploaded" })
    }

    const { title, description, privacy, thumbnail } = req.body
    const userId = (req as any).userId

    try {
      const video = new Video({
        title,
        description,
        url: `/uploads/${file.filename}`,
        thumbnail: thumbnail || "/placeholder.svg", // Use provided thumbnail or default
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

    // If the thumbnail is a full URL, redirect to it
    if (video.thumbnail.startsWith("http")) {
      return res.redirect(video.thumbnail)
    }

    // Otherwise, serve the file from the server
    const thumbnailPath = path.join(__dirname, "..", "..", video.thumbnail)
    if (fs.existsSync(thumbnailPath)) {
      res.sendFile(thumbnailPath)
    } else {
      res.status(404).json({ message: "Thumbnail file not found" })
    }
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

    // Delete the video file
    const videoPath = path.join(__dirname, "..", "..", video.url)
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath)
      console.log("Video file deleted:", videoPath)
    } else {
      console.log("Video file not found:", videoPath)
    }

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

export default router
























































































































