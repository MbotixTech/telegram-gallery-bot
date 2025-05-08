const mongoose = require('mongoose');
const Media = require('../models/Media');
const PQueue = require('p-queue').default;

const mediaQueue = new PQueue({ concurrency: 3 });

async function connectDB(uri) {
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('✅ MongoDB connected');
}

async function saveMedia(userId, file_id, type, full_name) {
  return mediaQueue.add(() => Media.create({ userId, file_id, type, full_name }));
}

async function getUserMedia(userId) {
  return Media.find({ userId }).sort({ createdAt: -1 });
}

async function getUserMediaByTypePaged(userId, type, skip = 0, limit = 5) {
  return Media.find({ userId, type }).sort({ createdAt: -1 }).skip(skip).limit(limit);
}

async function countUserMedia(userId) {
  return Media.countDocuments({ userId });
}

async function deleteMedia(userId, file_id) {
  return mediaQueue.add(() => Media.deleteOne({ userId, file_id }));
}

async function getAllUsers() {
  return Media.aggregate([
    { $group: { _id: '$userId', full_name: { $first: '$full_name' } } },
    { $project: { userId: '$_id', full_name: 1, _id: 0 } }
  ]);
}

module.exports = {
  connectDB,
  saveMedia,
  getUserMedia,
  getUserMediaByTypePaged,
  countUserMedia,
  deleteMedia,
  getAllUsers
};
