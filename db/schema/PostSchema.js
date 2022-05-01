import mongoose from "mongoose";
const { Schema } = mongoose;

const PostSchema = new Schema({
    title: String,
    body: String,
    createdDate: Date,
    author: mongoose.ObjectId
})

const PostModel = mongoose.model('posts', PostSchema);

export default PostModel;