"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Interaction = exports.Comment = exports.Video = exports.User = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// User Schema
const userSchema = new mongoose_1.default.Schema({
    username: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    avatar: { type: String, default: '/placeholder.svg' },
    bio: { type: String },
    following: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User' }],
    likes: { type: Number, default: 0 },
    tokenBalance: { type: Number, default: 0 },
    piWallet: { type: String },
    createdAt: { type: Date, default: Date.now },
});
// Video Schema
const videoSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    url: { type: String, required: true },
    fallbackImage: { type: String },
    description: { type: String },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    tips: { type: Number, default: 0 },
    music: { type: String },
    createdAt: { type: Date, default: Date.now },
});
// Comment Schema
const commentSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    videoId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Video', required: true },
    text: { type: String, required: true },
    likes: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});
// Interaction Schema
const interactionSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    videoId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Video', required: true },
    type: { type: String, enum: ['like', 'comment', 'share', 'tip'], required: true },
    createdAt: { type: Date, default: Date.now },
});
exports.User = mongoose_1.default.model('User', userSchema);
exports.Video = mongoose_1.default.model('Video', videoSchema);
exports.Comment = mongoose_1.default.model('Comment', commentSchema);
exports.Interaction = mongoose_1.default.model('Interaction', interactionSchema);
