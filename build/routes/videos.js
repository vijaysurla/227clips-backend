"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const mongoose_1 = require("mongoose");
const schemas_1 = require("../models/schemas");
const users_1 = require("./users");
const router = express_1.default.Router();
// Configure multer for video upload
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({ storage: storage });
// POST route to handle video upload
router.post('/', users_1.verifyToken, (req, res, next) => {
    upload.single('video')(req, res, (err) => __awaiter(void 0, void 0, void 0, function* () {
        if (err instanceof multer_1.default.MulterError) {
            return res.status(400).json({ message: 'File upload error', error: err.message });
        }
        else if (err) {
            return res.status(500).json({ message: 'Unknown error', error: err.message });
        }
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No video file uploaded' });
        }
        const { title, description, privacy, thumbnail } = req.body;
        const userId = req.userId;
        try {
            const video = new schemas_1.Video({
                title,
                description,
                url: `/uploads/${file.filename}`,
                thumbnail: thumbnail || '/placeholder.svg',
                user: userId,
                privacy: privacy || 'public'
            });
            const savedVideo = yield video.save();
            yield schemas_1.User.findByIdAndUpdate(userId, { $inc: { uploadedVideosCount: 1 } });
            res.status(201).json(savedVideo);
        }
        catch (error) {
            console.error('Error uploading video:', error);
            res.status(500).json({ message: 'Server error while uploading video' });
        }
    }));
});
// GET route to fetch videos for a specific user
router.get('/user/:userId', users_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        const videos = yield schemas_1.Video.find({ user: new mongoose_1.Types.ObjectId(userId) })
            .sort({ createdAt: -1 });
        res.json(videos);
    }
    catch (error) {
        console.error('Error fetching user videos:', error);
        res.status(500).json({ message: 'Server error while fetching user videos' });
    }
}));
// GET route to fetch all videos (public)
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const videos = yield schemas_1.Video.find({ privacy: 'public' })
            .populate('user', 'username displayName avatar')
            .sort({ createdAt: -1 });
        res.json(videos);
    }
    catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ message: 'Server error while fetching videos' });
    }
}));
// GET route to fetch a specific video
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const video = yield schemas_1.Video.findById(req.params.id).populate('user', 'username displayName avatar');
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }
        res.json(video);
    }
    catch (error) {
        console.error('Error fetching video:', error);
        res.status(500).json({ message: 'Server error while fetching video' });
    }
}));
// Like/Unlike video
router.post('/:id/like', users_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const videoId = req.params.id;
        const userId = req.userId;
        const video = yield schemas_1.Video.findById(videoId);
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }
        const user = yield schemas_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const likedIndex = video.likes.findIndex(id => id.equals(new mongoose_1.Types.ObjectId(userId)));
        if (likedIndex === -1) {
            // Like the video
            video.likes.push(new mongoose_1.Types.ObjectId(userId));
            if (!user.likedVideos) {
                user.likedVideos = [];
            }
            user.likedVideos.push(new mongoose_1.Types.ObjectId(videoId));
        }
        else {
            // Unlike the video
            video.likes.splice(likedIndex, 1);
            if (user.likedVideos) {
                user.likedVideos = user.likedVideos.filter(id => !id.equals(new mongoose_1.Types.ObjectId(videoId)));
            }
        }
        yield video.save();
        yield user.save();
        res.json({ likes: video.likes.length, isLiked: likedIndex === -1 });
    }
    catch (error) {
        console.error('Error liking/unliking video:', error);
        res.status(500).json({ message: 'Server error while processing like/unlike' });
    }
}));
// Add a comment to a video
router.post('/:id/comment', users_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const videoId = req.params.id;
        const userId = req.userId;
        const { content } = req.body;
        const video = yield schemas_1.Video.findById(videoId);
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }
        const user = yield schemas_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const newComment = new schemas_1.Comment({
            content,
            user: new mongoose_1.Types.ObjectId(userId),
            video: new mongoose_1.Types.ObjectId(videoId),
        });
        yield newComment.save();
        video.comments.push(newComment._id);
        yield video.save();
        const populatedComment = yield schemas_1.Comment.findById(newComment._id).populate('user', 'username displayName avatar');
        res.status(201).json({
            comment: populatedComment,
            commentCount: video.comments.length
        });
    }
    catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Server error while adding comment' });
    }
}));
// Get comments for a video
router.get('/:id/comments', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const videoId = req.params.id;
        const comments = yield schemas_1.Comment.find({ video: new mongoose_1.Types.ObjectId(videoId) })
            .populate('user', 'username displayName avatar')
            .sort({ createdAt: -1 });
        res.json(comments);
    }
    catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Server error while fetching comments' });
    }
}));
// Delete a comment
router.delete('/:id/comments/:commentId', users_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: videoId, commentId } = req.params;
        const userId = req.userId;
        const comment = yield schemas_1.Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        if (!comment.user.equals(userId)) {
            return res.status(403).json({ message: 'You are not authorized to delete this comment' });
        }
        yield schemas_1.Comment.findByIdAndDelete(commentId);
        const video = yield schemas_1.Video.findById(videoId);
        if (video) {
            video.comments = video.comments.filter((id) => !id.equals(new mongoose_1.Types.ObjectId(commentId)));
            yield video.save();
        }
        res.json({ message: 'Comment deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Server error while deleting comment' });
    }
}));
// GET route to fetch liked videos for a user
router.get('/liked/:userId', users_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        const user = yield schemas_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const likedVideos = yield schemas_1.Video.find({ _id: { $in: user.likedVideos } })
            .populate('user', 'username displayName avatar')
            .sort({ createdAt: -1 });
        res.json(likedVideos);
    }
    catch (error) {
        console.error('Error fetching liked videos:', error);
        res.status(500).json({ message: 'Server error while fetching liked videos' });
    }
}));
// DELETE route to delete a video
router.delete('/:id', users_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const videoId = req.params.id;
        const userId = req.userId;
        console.log('Attempting to delete video:', videoId);
        console.log('User ID:', userId);
        const video = yield schemas_1.Video.findById(videoId);
        if (!video) {
            console.log('Video not found:', videoId);
            return res.status(404).json({ message: 'Video not found' });
        }
        console.log('Video found:', video);
        if (video.user.toString() !== userId) {
            console.log('Unauthorized deletion attempt. Video user:', video.user, 'Request user:', userId);
            return res.status(403).json({ message: 'You are not authorized to delete this video' });
        }
        // Delete the video file
        const videoPath = path_1.default.join(__dirname, '..', '..', video.url);
        if (fs_1.default.existsSync(videoPath)) {
            fs_1.default.unlinkSync(videoPath);
            console.log('Video file deleted:', videoPath);
        }
        else {
            console.log('Video file not found:', videoPath);
        }
        // Delete the video document
        const deletedVideo = yield schemas_1.Video.findByIdAndDelete(videoId);
        console.log('Video document deleted:', deletedVideo);
        // Remove video reference from user's likedVideos
        const updateResult = yield schemas_1.User.updateMany({ likedVideos: videoId }, { $pull: { likedVideos: videoId } });
        console.log('Users updated:', updateResult);
        // Delete all comments associated with the video
        const deleteCommentsResult = yield schemas_1.Comment.deleteMany({ video: videoId });
        console.log('Comments deleted:', deleteCommentsResult);
        yield schemas_1.User.findByIdAndUpdate(userId, { $inc: { uploadedVideosCount: -1 } });
        console.log('Updated user video count');
        res.json({ message: 'Video deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({ message: 'Server error while deleting video' });
    }
}));
// Add tip to a video
router.post('/:id/tip', users_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const videoId = req.params.id;
        const senderId = req.userId;
        const { amount } = req.body;
        // Validate amount
        if (!amount || amount < 1) {
            return res.status(400).json({ message: 'Invalid tip amount' });
        }
        const video = yield schemas_1.Video.findById(videoId).populate('user', '_id tokenBalance');
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }
        const sender = yield schemas_1.User.findById(senderId);
        if (!sender) {
            return res.status(404).json({ message: 'Sender not found' });
        }
        // Check if sender has enough tokens
        if (sender.tokenBalance < amount) {
            return res.status(400).json({ message: 'Insufficient tokens' });
        }
        const receiverId = video.user._id;
        // Create tip record
        const tip = new schemas_1.Tip({
            sender: senderId,
            receiver: receiverId,
            video: videoId,
            amount,
            createdAt: new Date()
        });
        // Update token balances
        sender.tokenBalance -= amount;
        yield schemas_1.User.findByIdAndUpdate(receiverId, {
            $inc: { tokenBalance: amount }
        });
        // Save changes
        yield Promise.all([
            tip.save(),
            sender.save()
        ]);
        // Return populated tip
        const populatedTip = yield schemas_1.Tip.findById(tip._id)
            .populate('sender', 'username displayName avatar')
            .populate('receiver', 'username displayName avatar');
        res.status(201).json(populatedTip);
    }
    catch (error) {
        console.error('Error processing tip:', error);
        res.status(500).json({ message: 'Server error while processing tip' });
    }
}));
// Get tips for a video
router.get('/:id/tips', users_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const videoId = req.params.id;
        const tips = yield schemas_1.Tip.find({ video: videoId })
            .populate('sender', 'username displayName avatar')
            .populate('receiver', 'username displayName avatar')
            .sort({ createdAt: -1 });
        res.json(tips);
    }
    catch (error) {
        console.error('Error fetching tips:', error);
        res.status(500).json({ message: 'Server error while fetching tips' });
    }
}));
// Get tips summary for a video
router.get('/:id/tips/summary', users_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const videoId = req.params.id;
        const tips = yield schemas_1.Tip.find({ video: videoId });
        const totalAmount = tips.reduce((sum, tip) => sum + tip.amount, 0);
        const uniqueSenders = new Set(tips.map(tip => tip.sender.toString())).size;
        res.json({
            totalAmount,
            tipCount: tips.length,
            uniqueSenders
        });
    }
    catch (error) {
        console.error('Error fetching tips summary:', error);
        res.status(500).json({ message: 'Server error while fetching tips summary' });
    }
}));
exports.default = router;
