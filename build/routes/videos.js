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
const schemas_1 = require("../models/schemas");
const router = express_1.default.Router();
// Get all videos
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const videos = yield schemas_1.Video.find().sort({ createdAt: -1 }).limit(20);
        res.json(videos);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}));
// Get a specific video
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const video = yield schemas_1.Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }
        res.json(video);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}));
// Create a new video
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newVideo = new schemas_1.Video(req.body);
        const savedVideo = yield newVideo.save();
        res.status(201).json(savedVideo);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}));
// Handle video interaction (like, comment, share, tip)
router.post('/:id/interact', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, type } = req.body;
        const videoId = req.params.id;
        const newInteraction = new schemas_1.Interaction({ userId, videoId, type });
        yield newInteraction.save();
        const video = yield schemas_1.Video.findByIdAndUpdate(videoId, { $inc: { [type + 's']: 1 } }, { new: true });
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }
        res.json(video);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}));
exports.default = router;
