import mongoose, { Document, Schema } from 'mongoose';

// User Schema
export interface UserDocument extends Document {
  uid: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  following: mongoose.Types.ObjectId[];
  followers: mongoose.Types.ObjectId[];
  likes: number;
  tokenBalance: number;
  createdAt: Date;
  likedVideos: mongoose.Types.ObjectId[]; // Removed optional '?' operator
  instagram?: string;
  youtube?: string;
  uploadedVideosCount: number;
}

const userSchema = new Schema<UserDocument>({
  uid: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  avatar: { type: String, default: '/placeholder.svg' },
  bio: { type: String },
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  likes: { type: Number, default: 0 },
  tokenBalance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  likedVideos: { type: [Schema.Types.ObjectId], ref: 'Video', default: [] }, // Updated to initialize as an empty array
  instagram: { type: String },
  youtube: { type: String },
  uploadedVideosCount: { type: Number, default: 0 }, // Added uploadedVideosCount field
});

export const User = mongoose.model<UserDocument>('User', userSchema);

// Video Schema
export interface VideoDocument extends Document {
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  user: mongoose.Types.ObjectId | UserDocument;
  likes: mongoose.Types.ObjectId[];
  views: number;
  comments: mongoose.Types.ObjectId[];
  createdAt: Date;
  privacy: string;
}

const videoSchema = new mongoose.Schema<VideoDocument>({
  title: { type: String, required: true },
  description: { type: String },
  url: { type: String, required: true },
  thumbnail: { type: String, default: '/placeholder.svg' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  views: { type: Number, default: 0 },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  createdAt: { type: Date, default: Date.now },
  privacy: { type: String, default: 'public' }
});

export const Video = mongoose.model<VideoDocument>('Video', videoSchema);

// Comment Schema
export interface CommentDocument extends Document {
  content: string;
  user: mongoose.Types.ObjectId | UserDocument;
  video: mongoose.Types.ObjectId | VideoDocument;
  likes: number;
  replies: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const commentSchema = new mongoose.Schema<CommentDocument>({
  content: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  likes: { type: Number, default: 0 },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  createdAt: { type: Date, default: Date.now }
});

export const Comment = mongoose.model<CommentDocument>('Comment', commentSchema);

// Interaction Schema
export interface InteractionDocument extends Document {
  user: mongoose.Types.ObjectId | UserDocument;
  video: mongoose.Types.ObjectId | VideoDocument;
  type: 'like' | 'view' | 'share';
  createdAt: Date;
}

const interactionSchema = new mongoose.Schema<InteractionDocument>({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  type: { type: String, enum: ['like', 'view', 'share'], required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Interaction = mongoose.model<InteractionDocument>('Interaction', interactionSchema);

// Tip Schema
export interface TipDocument extends Document {
  sender: mongoose.Types.ObjectId | UserDocument;
  receiver: mongoose.Types.ObjectId | UserDocument;
  video: mongoose.Types.ObjectId | VideoDocument;
  amount: number;
  createdAt: Date;
}

const tipSchema = new mongoose.Schema<TipDocument>({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  amount: { type: Number, required: true, min: 1 },
  createdAt: { type: Date, default: Date.now }
});

export const Tip = mongoose.model<TipDocument>('Tip', tipSchema);





















