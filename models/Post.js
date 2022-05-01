import PostModel from "../db/schema/PostSchema.js";
import FollowModel from "../db/schema/FollowSchema.js";
import mongodb from 'mongodb';
import User from "./User.js";
import sanitizeHtml from "sanitize-html";

class Post {
    constructor(data = {}, userId = '', requestedPostId = '') {
        this.data = data;
        this.userId = userId;
        this.errors = [];
        this.requestedPostId = requestedPostId;
    }
    create() {
        return new Promise(async (resolve, reject) => {
            this.cleanUp();
            this.validate();

            if (!this.errors.length) {
                // save post when no errors
                try {
                    let info = await PostModel.create(this.data);
                    resolve(info._id.toString());
                } catch (e) {
                    this.errors.push("Please try again later.");
                    reject(this.errors);
                }
            } else {
                reject(this.errors);
            }
        });
    }
    cleanUp() {
        if (typeof (this.data.title) !== "string") {
            this.data.title = "";
        }
        if (typeof (this.data.body) !== "string") {
            this.data.body = "";
        }

        // Get rid of unwanted data
        this.data = {
            // Sanitize any html in input field.
            title: sanitizeHtml(this.data.title.trim(), {
                allowedTags: [],
                allowedAttributes: {},
            }),
            body: sanitizeHtml(this.data.body.trim(), {
                allowedTags: [],
                allowedAttributes: {},
            }),
            createdDate: new Date(),
            author: this.userId
        }
    }
    validate() {
        if (this.data.title === "") {
            this.errors.push("You must provide a title.");
        }
        if (this.data.body === "") {
            this.errors.push("You must provide post content.");
        }
    }
    reusablePostQuery(uniqueOperations, visitorId, finalOperations = []) {
        return new Promise(async (resolve, reject) => {
            let aggOperations = uniqueOperations.concat([
                {
                    $lookup: {
                        from: "users",
                        localField: "author",
                        foreignField: "_id",
                        as: "authorDocument"
                    }
                },
                {
                    $project: {
                        title: 1,
                        body: 1,
                        createdDate: 1,
                        authorId: "$author",
                        author: { $arrayElemAt: ["$authorDocument", 0] }
                    }
                }
            ]).concat(finalOperations);

            let posts = await PostModel.aggregate(aggOperations);

            // Filter out unnecessary author properties
            posts = posts.map((post) => {
                post.isVisitorOwner = post.authorId.equals(visitorId);
                post.authorId = undefined;
                post.author = {
                    username: post.author.username,
                    avatar: new User(post.author, true).avatar
                };
                return post;
            })
            resolve(posts);
        });
    }
    findSingleById(id, visitorId) {
        return new Promise(async (resolve, reject) => {
            if (typeof (id) !== "string" || !mongodb.ObjectId.isValid(id)) {
                reject();
                return;
            }
            let posts = await this.reusablePostQuery([
                { $match: { _id: new mongodb.ObjectId(id) } }
            ], visitorId);
            if (posts.length) {
                resolve(posts[0]);
            } else {
                reject();
            }
        })
    }
    findByAuthorId(id) {
        return this.reusablePostQuery([
            { $match: { author: id } },
            { $sort: { createdDate: -1 } }
        ]);
    }
    update() {
        return new Promise(async (resolve, reject) => {
            try {
                let post = await this.findSingleById(this.requestedPostId, this.userId);
                if (post.isVisitorOwner) {
                    // Actually update db.
                    let status = await this.actuallyUpdate();
                    resolve(status);
                } else {
                    reject();
                }
            } catch {
                reject();
            }
        })
    }
    actuallyUpdate() {
        return new Promise(async (resolve, reject) => {
            this.cleanUp();
            this.validate();
            if (!this.errors.length) {
                await PostModel.updateOne({ _id: new mongodb.ObjectId(this.requestedPostId) }, {
                    $set: {
                        title: this.data.title,
                        body: this.data.body
                    }
                });
                resolve("success");
            } else {
                resolve('failure');
            }
        })
    }
    delete(postIdToDelete, currentUserId) {
        return new Promise(async (resolve, reject) => {
            try {
                let post = await this.findSingleById(postIdToDelete, currentUserId);
                if (post.isVisitorOwner) {
                    await PostModel.deleteOne({
                        _id: new mongodb.ObjectId(postIdToDelete)
                    })
                    resolve();
                } else {
                    reject();
                }
            } catch {
                reject();
            }
        })
    }
    search(searchTerm) {
        return new Promise(async (resolve, reject) => {
            if (typeof searchTerm === 'string') {
                let posts = await this.reusablePostQuery([
                    { $match: { $text: { $search: searchTerm } } }
                ], undefined, [{ $sort: { score: { $meta: "textScore" } } }]);
                resolve(posts);
            } else {
                reject();
            }
        })
    }
    countPostsByAuthor(id) {
        return new Promise(async (resolve, reject) => {
            let postsCount = await PostModel.countDocuments({
                author: id
            })
            resolve(postsCount);
        })
    }
    async getFeed(id) {
        // Create an array of the user ids that current user follows
        let followedUsers = await FollowModel.find({
            visitorId: id
        });
        followedUsers = followedUsers.map((followedUser) => {
            return followedUser.followedId;
        })

        // Look for posts that author is in the above data
        return this.reusablePostQuery([
            {$match: {author: {$in: followedUsers}}},
            {$sort: {createdDate: -1}}
        ])
    }
}

export default Post;