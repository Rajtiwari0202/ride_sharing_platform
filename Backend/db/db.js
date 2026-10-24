const mongoose = require('mongoose');

async function connectToDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
  }
}

module.exports = { connectToDb }; 
