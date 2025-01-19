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
const mongoose_1 = __importDefault(require("mongoose"));
const schemas_1 = require("../models/schemas");
const config_1 = __importDefault(require("../config"));
function cleanupComments() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mongoose_1.default.connect(config_1.default.mongodb.uri);
            console.log('Connected to database');
            // Find all videos
            const videos = yield schemas_1.Video.find();
            for (const video of videos) {
                // Get all valid comment IDs for this video
                const validCommentIds = yield schemas_1.Comment.find({ video: video._id }).distinct('_id');
                // Update the video to only include valid comment IDs
                video.comments = validCommentIds;
                yield video.save();
                console.log(`Updated comments for video ${video._id}`);
            }
            // Remove any comments that don't have a corresponding video
            const result = yield schemas_1.Comment.deleteMany({ video: { $nin: videos.map(v => v._id) } });
            console.log(`Deleted ${result.deletedCount} orphaned comments`);
            console.log('Cleanup completed successfully');
        }
        catch (error) {
            console.error('Error during cleanup:', error);
        }
        finally {
            yield mongoose_1.default.disconnect();
        }
    });
}
cleanupComments();
