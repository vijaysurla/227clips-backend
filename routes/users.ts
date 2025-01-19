import express, { Request, Response, NextFunction } from 'express';
import { User, Video, UserDocument } from '../models/schemas';
import jwt from 'jsonwebtoken';
import config from '../config';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Types } from 'mongoose';

const router = express.Router();

// Authenticate user
router.post('/authenticate', async (req: Request, res: Response) => {
  try {
    const { uid, username, accessToken } = req.body;

    console.log('Received authentication request:', { uid, username });

    let user = await User.findOne({ uid });

    if (!user) {
      // Create a new user if not found
      user = new User({
        uid,
        username,
        displayName: username,
      });
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '1d' });

    res.json({ user, token });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
});

// Configure multer for avatar upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  }
});

interface AuthenticatedRequest extends Request {
  userId?: string;
}

// Middleware to verify JWT token
export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Update avatar
router.post('/:id/avatar', verifyToken, upload.single('avatar'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    
    // Verify user is updating their own profile
    if (userId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('File received:', file); 

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old avatar file if it exists and isn't the default
    if (user.avatar && user.avatar !== '/placeholder.svg' && fs.existsSync(path.join(__dirname, '../../', user.avatar))) {
      fs.unlinkSync(path.join(__dirname, '../../', user.avatar));
    }

    // Update user's avatar path
    user.avatar = `/uploads/avatars/${file.filename}`;
    await user.save();

    console.log('User updated with new avatar:', user); 

    res.json({ avatar: user.avatar });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Server error while uploading avatar' });
  }
});

// Update user profile
router.put('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    
    // Verify user is updating their own profile
    if (userId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }

    const { displayName, username, bio, instagram, youtube } = req.body;
    
    // Find user first to check if username is taken
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
    }

    const updateData: Partial<UserDocument> = {};
    if (displayName) updateData.displayName = displayName;
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (instagram !== undefined) updateData.instagram = instagram;
    if (youtube !== undefined) updateData.youtube = youtube;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Server error while updating profile' });
    }
  }
});

// Get user profile
router.get('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    
    // Verify user is fetching their own profile
    if (userId !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to view this profile' });
    }

    const user = await User.findById(userId).select('-__v');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
});

// Other routes remain the same...

export default router;















































