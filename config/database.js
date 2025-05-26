const mongoose = require('mongoose');

module.exports.connect = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/projectbhx");
    console.log("Connected Successful!")
  } catch (error) {
    console.log("Connected Failure")
  }
}

