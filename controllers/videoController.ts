import { Request, Response } from 'express';
import { Video, Interaction } from '../models/schemas';

export const getAllVideos = async (req: Request, res: Response) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 }).limit(20);
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getVideoById = async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    res.json(video);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createVideo = async (req: Request, res: Response) => {
  try {
    const newVideo = new Video(req.body);
    const savedVideo = await newVideo.save();
    res.status(201).json(savedVideo);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const interactWithVideo = async (req: Request, res: Response) => {
  try {
    const { userId, type } = req.body;
    const videoId = req.params.id;

    const newInteraction = new Interaction({ userId, videoId, type });
    await newInteraction.save();

    const video = await Video.findByIdAndUpdate(
      videoId,
      { $inc: { [type + 's']: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    res.json(video);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

