"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const express_session_1 = __importDefault(require("express-session"));
const config_1 = __importDefault(require("./config"));
const users_1 = __importDefault(require("./routes/users"));
const videos_1 = __importDefault(require("./routes/videos"));
const auth_1 = require("./middleware/auth");
const app = (0, express_1.default)();
// Connect to MongoDB
mongoose_1.default.connect(config_1.default.mongodb.uri, {
    user: config_1.default.mongodb.username,
    pass: config_1.default.mongodb.password,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
// Middleware
app.use((0, cors_1.default)({ origin: config_1.default.frontendUrl, credentials: true }));
app.use(express_1.default.json());
// Use a type assertion to resolve the incompatibility
app.use((0, express_session_1.default)({
    secret: config_1.default.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));
// Routes
app.use('/api/users', auth_1.authenticatePiUser, users_1.default);
app.use('/api/videos', auth_1.authenticatePiUser, videos_1.default);
app.listen(config_1.default.port, () => {
    console.log(`Server running on port ${config_1.default.port}`);
});
