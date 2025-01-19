"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const search_1 = __importDefault(require("./routes/search"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const express_session_1 = __importDefault(require("express-session"));
const config_1 = __importDefault(require("./config"));
const users_1 = __importDefault(require("./routes/users"));
const videos_1 = __importDefault(require("./routes/videos"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
// Connect to MongoDB
mongoose_1.default.connect(config_1.default.mongodb.uri, {
    user: config_1.default.mongodb.username,
    pass: config_1.default.mongodb.password,
    dbName: 'piclips'
})
    .then(() => {
    var _a;
    console.log('Connected to MongoDB');
    console.log('Database:', ((_a = mongoose_1.default.connection.db) === null || _a === void 0 ? void 0 : _a.databaseName) || 'Unknown');
})
    .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});
// CORS configuration
app.use((0, cors_1.default)({
    origin: config_1.default.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Body parser configuration with increased limits
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Serve uploaded files
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Ensure session secret is set
if (!config_1.default.sessionSecret) {
    console.error('SESSION_SECRET is not set in the environment variables');
    process.exit(1);
}
// Session configuration
app.use((0, express_session_1.default)({
    secret: config_1.default.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));
// Increase timeout for requests
app.use((req, res, next) => {
    res.setTimeout(300000, () => {
        console.log('Request has timed out.');
        res.status(408).send('Request has timed out.');
    });
    next();
});
// Routes
app.use('/api/users', users_1.default);
app.use('/api/videos', videos_1.default);
// Add the search route to your Express app
app.use('/api/search', search_1.default);
// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
app.listen(config_1.default.port, () => {
    console.log(`Server running on port ${config_1.default.port}`);
});
exports.default = app;
