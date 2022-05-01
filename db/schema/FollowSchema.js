import mongoose from "mongoose";
const { Schema } = mongoose;

const FollowSchema = new Schema({
    followedId: mongoose.ObjectId,
    visitorId: mongoose.ObjectId
})

const FollowModel = mongoose.model('follows', FollowSchema);

export default FollowModel;