require('dotenv').config();
const { connectMongoDB, connectMySQL } = require('./src/config/db');
const { Notification } = require('./src/models/mongo/index');
const User = require('./src/models/mysql/User.model');

async function seed() {
  await connectMongoDB();
  await connectMySQL();
  
  const user = await User.findOne();
  if (!user) {
    console.log("No user found");
    process.exit(0);
  }
  
  await Notification.create({
    user_id: user.id,
    type: 'system',
    title: 'Welcome to DevPilot AI!',
    message: 'We are thrilled to have you here. Your notifications are now working correctly.',
    is_read: false
  });
  
  await Notification.create({
    user_id: user.id,
    type: 'mention',
    title: 'You were mentioned in a task',
    message: '@Alex mentioned you in "Fix navigation bar responsiveness"',
    is_read: false
  });
  
  console.log("Seeded notifications for user", user.id);
  process.exit(0);
}

seed().catch(console.error);
