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
exports.verifyToken = void 0;
const express_1 = __importDefault(require("express"));
const schemas_1 = require("../models/schemas");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
// Authenticate user
router.post('/authenticate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uid, username, accessToken } = req.body;
        console.log('Received authentication request:', { uid, username });
        let user = yield schemas_1.User.findOne({ uid });
        if (!user) {
            // Create a new user if not found
            user = new schemas_1.User({
                uid,
                username,
                displayName: username,
            });
            yield user.save();
        }
        // Generate JWT token
        //const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '1d' });
        //Replaced Genrate JWT token with JWT_SECRET created
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ user, token });
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ message: 'Server error during authentication' });
    }
}));
// Configure multer for avatar upload
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads/avatars');
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
        }
    }
});
// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwtSecret);
        req.userId = decoded.id;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};
exports.verifyToken = verifyToken;
// Update avatar
router.post('/:id/avatar', exports.verifyToken, upload.single('avatar'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const user = yield schemas_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Delete old avatar file if it exists and isn't the default
        if (user.avatar && user.avatar !== '/placeholder.svg' && fs_1.default.existsSync(path_1.default.join(__dirname, '../../', user.avatar))) {
            fs_1.default.unlinkSync(path_1.default.join(__dirname, '../../', user.avatar));
        }
        // Update user's avatar path
        user.avatar = `/uploads/avatars/${file.filename}`;
        yield user.save();
        console.log('User updated with new avatar:', user);
        res.json({ avatar: user.avatar });
    }
    catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ message: 'Server error while uploading avatar' });
    }
}));
// Update user profile
router.put('/:id', exports.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        // Verify user is updating their own profile
        if (userId !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to update this profile' });
        }
        const { displayName, username, bio, instagram, youtube } = req.body;
        // Find user first to check if username is taken
        if (username) {
            const existingUser = yield schemas_1.User.findOne({ username, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ message: 'Username is already taken' });
            }
        }
        const updateData = {};
        if (displayName)
            updateData.displayName = displayName;
        if (username)
            updateData.username = username;
        if (bio !== undefined)
            updateData.bio = bio;
        if (instagram !== undefined)
            updateData.instagram = instagram;
        if (youtube !== undefined)
            updateData.youtube = youtube;
        const user = yield schemas_1.User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('Error updating profile:', error);
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        }
        else {
            res.status(500).json({ message: 'Server error while updating profile' });
        }
    }
}));
// Get user profile
router.get('/:id', exports.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        // Verify user is fetching their own profile
        if (userId !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to view this profile' });
        }
        const user = yield schemas_1.User.findById(userId).select('-__v');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error while fetching user profile' });
    }
}));
// Other routes remain the same...
exports.default = router;
