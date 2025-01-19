"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tip = exports.Interaction = exports.Comment = exports.Video = exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const userSchema = new mongoose_1.Schema({
    uid: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    displayName: { type: String, required: true },
    avatar: { type: String, default: '/placeholder.svg' },
    bio: { type: String },
    following: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    likes: { type: Number, default: 0 },
    tokenBalance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    likedVideos: { type: [mongoose_1.Schema.Types.ObjectId], ref: 'Video', default: [] },
    instagram: { type: String },
    youtube: { type: String },
    uploadedVideosCount: { type: Number, default: 0 }, // Added uploadedVideosCount field
});
exports.User = mongoose_1.default.model('User', userSchema);
const videoSchema = new mongoose_1.default.Schema({
    title: { type: String, required: true },
    description: { type: String },
    url: { type: String, required: true },
    thumbnail: { type: String, default: '/placeholder.svg' },
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    likes: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User' }],
    views: { type: Number, default: 0 },
    comments: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Comment' }],
    createdAt: { type: Date, default: Date.now },
    privacy: { type: String, default: 'public' }
});
exports.Video = mongoose_1.default.model('Video', videoSchema);
const commentSchema = new mongoose_1.default.Schema({
    content: { type: String, required: true },
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    video: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Video', required: true },
    likes: { type: Number, default: 0 },
    replies: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Comment' }],
    createdAt: { type: Date, default: Date.now }
});
exports.Comment = mongoose_1.default.model('Comment', commentSchema);
const interactionSchema = new mongoose_1.default.Schema({
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    video: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Video', required: true },
    type: { type: String, enum: ['like', 'view', 'share'], required: true },
    createdAt: { type: Date, default: Date.now }
});
exports.Interaction = mongoose_1.default.model('Interaction', interactionSchema);
const tipSchema = new mongoose_1.default.Schema({
    sender: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    video: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Video', required: true },
    amount: { type: Number, required: true, min: 1 },
    createdAt: { type: Date, default: Date.now }
});
exports.Tip = mongoose_1.default.model('Tip', tipSchema);
