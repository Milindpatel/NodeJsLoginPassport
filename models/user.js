const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 50 },
  password: { type: String, required: true },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  name: { type: String, required: true, trim: true, maxlength: 100 },
});

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(String(candidate), this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
