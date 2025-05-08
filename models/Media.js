const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  userId: Number,
  file_id: String,
  type: {
    type: String,
    required: true,
    enum: ['photo', 'video', 'document', 'audio', 'voice', 'animation', 'sticker'],
  },
  full_name: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Media', mediaSchema);
