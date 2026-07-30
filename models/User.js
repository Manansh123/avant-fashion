const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // Kyuki name hi username hai, toh ye unique hona chahiye
        lowercase: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String
        // NOTE: not required anymore — Google Sign-In users never set a password.
        // Local signup still always sends one (enforced in index.js /api/signup).
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true // allows many docs with no googleId without violating uniqueness
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    }
});

module.exports = mongoose.model('User', userSchema);