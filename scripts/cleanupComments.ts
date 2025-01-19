import mongoose from 'mongoose';
import { Video, Comment } from '../models/schemas';
import config from '../config';

async function cleanupComments() {
  try {
    await mongoose.connect(config.mongodb.uri);

    console.log('Connected to database');

    // Find all videos
    const videos = await Video.find();

    for (const video of videos) {
      // Get all valid comment IDs for this video
      const validCommentIds = await Comment.find({ video: video._id }).distinct('_id');

      // Update the video to only include valid comment IDs
      video.comments = validCommentIds;
      await video.save();

      console.log(`Updated comments for video ${video._id}`);
    }

    // Remove any comments that don't have a corresponding video
    const result = await Comment.deleteMany({ video: { $nin: videos.map(v => v._id) } });
    console.log(`Deleted ${result.deletedCount} orphaned comments`);

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
  }
}

cleanupComments();









