const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const Project = require('../src/models/mongo/Project.model');
const Task = require('../src/models/mongo/Task.model');
const { Sprint, ChatMessage, Notification, ActivityLog, AiConversation, Document, TeamWhiteboard } = require('../src/models/mongo');

const importDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/devpilot_ai');
    console.log('✅ Connected to MongoDB');

    const filePath = path.join(__dirname, '..', 'mongo_data.json');
    if (!fs.existsSync(filePath)) {
      console.error('❌ mongo_data.json not found! Please make sure the file exists before importing.');
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Clear existing data to avoid duplicate key errors
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Sprint.deleteMany({});
    await ChatMessage.deleteMany({});
    await Notification.deleteMany({});
    await ActivityLog.deleteMany({});
    await AiConversation.deleteMany({});
    await Document.deleteMany({});
    await TeamWhiteboard.deleteMany({});

    console.log('✅ Cleared existing collections');

    // Insert new data
    if (data.projects?.length) await Project.insertMany(data.projects);
    if (data.tasks?.length) await Task.insertMany(data.tasks);
    if (data.sprints?.length) await Sprint.insertMany(data.sprints);
    if (data.chatMessages?.length) await ChatMessage.insertMany(data.chatMessages);
    if (data.notifications?.length) await Notification.insertMany(data.notifications);
    if (data.activityLogs?.length) await ActivityLog.insertMany(data.activityLogs);
    if (data.aiConversations?.length) await AiConversation.insertMany(data.aiConversations);
    if (data.documents?.length) await Document.insertMany(data.documents);
    if (data.teamWhiteboards?.length) await TeamWhiteboard.insertMany(data.teamWhiteboards);

    console.log('✅ Data successfully imported into MongoDB!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
};

importDB();
