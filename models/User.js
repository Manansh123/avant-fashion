const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,   // username hi hai, unique hona chahiye
        lowercase: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        // Google users ke liye password zaroori nahi
        required: function () {
            return this.authProvider !== 'google';
        }
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true   // sirf Google users ke liye set hoga
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    }
});

module.exports = mongoose.model('User', userSchema);