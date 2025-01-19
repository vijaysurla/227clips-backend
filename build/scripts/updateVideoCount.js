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
function updateVideoCount() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Explicitly specify the database name in the connection URI
            const dbUri = `${config_1.default.mongodb.uri}/piclips`;
            yield mongoose_1.default.connect(dbUri, {
                dbName: 'piclips' // Explicitly set database name
            });
            // Check if we have a valid database connection
            const db = mongoose_1.default.connection.db;
            if (!db) {
                console.error('Failed to establish database connection');
                return;
            }
            console.log('Connected to database:', db.databaseName);
            const users = yield schemas_1.User.find();
            console.log(`Found ${users.length} users`);
            for (const user of users) {
                console.log(`Processing user: ${user.username}`);
                console.log(`User ID in database: ${user._id}`);
                console.log(`User UID: ${user.uid}`);
                const videoCount = yield schemas_1.Video.countDocuments({ user: user._id });
                console.log(`Found ${videoCount} videos for user ${user.username}`);
                // Log a sample video to check its structure
                const sampleVideo = yield schemas_1.Video.findOne({ user: user._id });
                if (sampleVideo) {
                    console.log('Sample video:', JSON.stringify(sampleVideo, null, 2));
                }
                else {
                    console.log('No videos found for this user');
                }
                yield schemas_1.User.updateOne({ _id: user._id }, { $set: { uploadedVideosCount: videoCount } });
                console.log(`Updated user ${user.username} with video count: ${videoCount}`);
            }
            console.log('Video count update completed successfully');
            // Log the final results
            const updatedUsers = yield schemas_1.User.find().select('username uploadedVideosCount');
            console.log('Final user video counts:');
            updatedUsers.forEach(user => {
                console.log(`${user.username}: ${user.uploadedVideosCount} videos`);
            });
        }
        catch (error) {
            console.error('Error updating video count:', error);
        }
        finally {
            if (mongoose_1.default.connection.readyState === 1) { // 1 = connected
                yield mongoose_1.default.disconnect();
                console.log('Disconnected from database');
            }
        }
    });
}
updateVideoCount();
