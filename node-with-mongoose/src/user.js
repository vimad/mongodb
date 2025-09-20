import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: String
});

// collection name will become users (plural name)
export const User = mongoose.model('user', UserSchema);
