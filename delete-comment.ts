import mongoose from 'mongoose';
import { Video, Comment } from './models/schemas';
import config from './config';

async function deleteComment(commentId: string) {
  try {
    // Explicitly specify the database name in the connection URI
    const dbUri = `${config.mongodb.uri}/piclips`;
    
    await mongoose.connect(dbUri, {
      dbName: 'piclips' // Explicitly set database name
    });

    // Check if we have a valid database connection
    const db = mongoose.connection.db;
    if (!db) {
      console.error('Failed to establish database connection');
      return;
    }

    console.log('Connected to database:', db.databaseName);

    // Find the comment first to verify it exists and log its details
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      console.log('Comment lookup result:', comment);
      console.log('Attempted to find comment with ID:', commentId);
      console.log('Comment not found in database:', db.databaseName);
      return;
    }

    console.log('Found comment:', comment);

    // Delete the comment
    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
      console.log('Failed to delete comment');
      return;
    }

    console.log('Successfully deleted comment:', deletedComment);

    // Remove the comment reference from the associated video
    const updateResult = await Video.updateOne(
      { _id: deletedComment.video },
      { $pull: { comments: commentId } }
    );

    console.log('Video update result:', updateResult);

  } catch (error) {
    console.error('Error:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    if (mongoose.connection.readyState === 1) { // 1 = connected
      await mongoose.disconnect();
      console.log('Disconnected from database');
    }
  }
}

// Get the comment ID from command line arguments
const commentIdToDelete = process.argv[2];

if (!commentIdToDelete) {
  console.error('Please provide a comment ID as a command-line argument');
  process.exit(1);
}

console.log('Attempting to delete comment with ID:', commentIdToDelete);
deleteComment(commentIdToDelete);








