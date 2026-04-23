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
        type: String, 
        required: true 
    }
});

module.exports = mongoose.model('User', userSchema);