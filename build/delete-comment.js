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
const schemas_1 = require("./models/schemas");
const config_1 = __importDefault(require("./config"));
function deleteComment(commentId) {
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
            // Find the comment first to verify it exists and log its details
            const comment = yield schemas_1.Comment.findById(commentId);
            if (!comment) {
                console.log('Comment lookup result:', comment);
                console.log('Attempted to find comment with ID:', commentId);
                console.log('Comment not found in database:', db.databaseName);
                return;
            }
            console.log('Found comment:', comment);
            // Delete the comment
            const deletedComment = yield schemas_1.Comment.findByIdAndDelete(commentId);
            if (!deletedComment) {
                console.log('Failed to delete comment');
                return;
            }
            console.log('Successfully deleted comment:', deletedComment);
            // Remove the comment reference from the associated video
            const updateResult = yield schemas_1.Video.updateOne({ _id: deletedComment.video }, { $pull: { comments: commentId } });
            console.log('Video update result:', updateResult);
        }
        catch (error) {
            console.error('Error:', error);
            // Log more details about the error
            if (error instanceof Error) {
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            }
        }
        finally {
            if (mongoose_1.default.connection.readyState === 1) { // 1 = connected
                yield mongoose_1.default.disconnect();
                console.log('Disconnected from database');
            }
        }
    });
}
// Get the comment ID from command line arguments
const commentIdToDelete = process.argv[2];
if (!commentIdToDelete) {
    console.error('Please provide a comment ID as a command-line argument');
    process.exit(1);
}
console.log('Attempting to delete comment with ID:', commentIdToDelete);
deleteComment(commentIdToDelete);
