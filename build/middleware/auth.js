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
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticatePiUser = void 0;
const sdk_1 = require("@pinetwork-js/sdk");
// Initialize the Pi client
sdk_1.Pi.init({ version: "2.0" });
const onIncompletePaymentFound = (payment) => {
    console.log('Incomplete payment found:', payment);
    // Handle incomplete payment here
};
const authenticatePiUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const accessToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!accessToken) {
        return res.status(401).json({ message: 'No access token provided' });
    }
    try {
        const scopes = ['username', 'payments', 'wallet_address'];
        const authResult = yield sdk_1.Pi.authenticate(scopes, onIncompletePaymentFound);
        req.user = authResult.user;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Invalid access token' });
    }
});
exports.authenticatePiUser = authenticatePiUser;
