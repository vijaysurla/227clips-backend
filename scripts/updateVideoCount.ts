import mongoose from 'mongoose';
import { User, Video } from '../models/schemas';
import config from '../config';

async function updateVideoCount() {
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

    const users = await User.find();
    console.log(`Found ${users.length} users`);

    for (const user of users) {
      console.log(`Processing user: ${user.username}`);
      console.log(`User ID in database: ${user._id}`);
      console.log(`User UID: ${user.uid}`);

      const videoCount = await Video.countDocuments({ user: user._id });
      console.log(`Found ${videoCount} videos for user ${user.username}`);

      // Log a sample video to check its structure
      const sampleVideo = await Video.findOne({ user: user._id });
      if (sampleVideo) {
        console.log('Sample video:', JSON.stringify(sampleVideo, null, 2));
      } else {
        console.log('No videos found for this user');
      }

      await User.updateOne(
        { _id: user._id },
        { $set: { uploadedVideosCount: videoCount } }
      );
      console.log(`Updated user ${user.username} with video count: ${videoCount}`);
    }

    console.log('Video count update completed successfully');

    // Log the final results
    const updatedUsers = await User.find().select('username uploadedVideosCount');
    console.log('Final user video counts:');
    updatedUsers.forEach(user => {
      console.log(`${user.username}: ${user.uploadedVideosCount} videos`);
    });

  } catch (error) {
    console.error('Error updating video count:', error);
  } finally {
    if (mongoose.connection.readyState === 1) { // 1 = connected
      await mongoose.disconnect();
      console.log('Disconnected from database');
    }
  }
}

updateVideoCount();













