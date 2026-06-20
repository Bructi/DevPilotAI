const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const Project = require('../src/models/mongo/Project.model');
const Task = require('../src/models/mongo/Task.model');
const { Sprint, ChatMessage, Notification, ActivityLog, AiConversation, Document, TeamWhiteboard } = require('../src/models/mongo');

const exportDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/devpilot_ai');
    console.log('✅ Connected to MongoDB');

    const data = {
      projects: await Project.find({}),
      tasks: await Task.find({}),
      sprints: await Sprint.find({}),
      chatMessages: await ChatMessage.find({}),
      notifications: await Notification.find({}),
      activityLogs: await ActivityLog.find({}),
      aiConversations: await AiConversation.find({}),
      documents: await Document.find({}),
      teamWhiteboards: await TeamWhiteboard.find({})
    };

    const filePath = path.join(__dirname, '..', 'mongo_data.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Data successfully exported to mongo_data.json`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
};

exportDB();
