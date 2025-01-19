"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.default = {
    sessionSecret: process.env.SESSION_SECRET,
    piNetwork: {
        platformApiUrl: process.env.PLATFORM_API_URL || 'https://api.minepi.com',
    },
    mongodb: {
        uri: process.env.MONGODB_URI || `mongodb://${process.env.MONGO_HOST}/${process.env.MONGODB_DATABASE_NAME}`,
        username: process.env.MONGODB_USERNAME,
        password: process.env.MONGODB_PASSWORD,
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    port: process.env.PORT || 5000,
};
