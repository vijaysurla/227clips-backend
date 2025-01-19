import express, { Request, Response } from 'express';
import { User } from '../models/schemas';
import { verifyToken } from './users';

const router = express.Router();

router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const { term, type } = req.query;

    if (!term || typeof term !== 'string') {
      return res.status(400).json({ message: 'Invalid search term' });
    }

    let query;
    if (type === 'name') {
      query = {
        $or: [
          { username: { $regex: term, $options: 'i' } },
          { displayName: { $regex: term, $options: 'i' } }
        ]
      };
    } else if (type === 'hashtag') {
      // Assuming you have a 'hashtags' field in your User model
      query = { hashtags: { $regex: term, $options: 'i' } };
    } else {
      return res.status(400).json({ message: 'Invalid search type' });
    }

    const results = await User.find(query)
      .select('_id username displayName avatar')
      .limit(20);

    res.json(results);
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json({ message: 'Server error while searching' });
  }
});

export default router;

