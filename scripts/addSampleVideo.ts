import mongoose from 'mongoose';
import { Video } from '../models/schemas';
import config from '../config';

async function addSampleVideo() {
  try {
    const dbUri = `${config.mongodb.uri}/piclips`;
    
    await mongoose.connect(dbUri, {
      dbName: 'piclips'
    });

    console.log('Connected to database:', mongoose.connection.db.databaseName);

    const sampleVideo = new Video({
      title: 'Sample Video',
      description: 'This is a sample video for testing purposes',
      // Using a publicly accessible video URL for testing
      url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnail: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
      user: new mongoose.Types.ObjectId(),
      privacy: 'public',
    });

    await sampleVideo.save();
    console.log('Sample video added successfully:', sampleVideo);
    console.log('Database used:', mongoose.connection.db.databaseName);
  } catch (error) {
    console.error('Error adding sample video:', error);
  } finally {
    await mongoose.disconnect();
  }
}

addSampleVideo();







