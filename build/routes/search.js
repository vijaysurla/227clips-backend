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
const express_1 = __importDefault(require("express"));
const schemas_1 = require("../models/schemas");
const users_1 = require("./users");
const router = express_1.default.Router();
router.get('/', users_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        }
        else if (type === 'hashtag') {
            // Assuming you have a 'hashtags' field in your User model
            query = { hashtags: { $regex: term, $options: 'i' } };
        }
        else {
            return res.status(400).json({ message: 'Invalid search type' });
        }
        const results = yield schemas_1.User.find(query)
            .select('_id username displayName avatar')
            .limit(20);
        res.json(results);
    }
    catch (error) {
        console.error('Error in search:', error);
        res.status(500).json({ message: 'Server error while searching' });
    }
}));
exports.default = router;
