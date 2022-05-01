import UserModel from "../db/schema/UserSchema.js";
import FollowModel from "../db/schema/FollowSchema.js";
import User from "./User.js";

class Follow {
    constructor(followedUsername = "", visitorId = "") {
        this.followedUsername = followedUsername;
        this.visitorId = visitorId;
        this.errors = [];
    }
    create() {
        return new Promise(async (resolve, reject) => {
            this.cleanUp();
            await this.validate("create");
            if (!this.errors.length) {
                await FollowModel.create({
                    followedId: this.followedId,
                    visitorId: this.visitorId
                })
                resolve()
            } else {
                reject(this.errors);
            }
        })
    }
    delete() {
        return new Promise(async (resolve, reject) => {
            this.cleanUp();
            await this.validate("delete");
            if (!this.errors.length) {
                await FollowModel.deleteOne({
                    followedId: this.followedId,
                    visitorId: this.visitorId
                })
                resolve()
            } else {
                reject(this.errors);
            }
        })
    }

    cleanUp() {
        if (typeof (this.followedUsername) !== "string") {
            this.followedUsername = "";
        }
    }
    async validate(action) {
        // followedUsername must exist in the database.
        let followedAccount = await UserModel.findOne({ username: this.followedUsername })
        if (followedAccount) {
            this.followedId = followedAccount._id;
        } else {
            this.errors.push('You cannot follow a user that is not exist.')
        }

        let doesFollowAlreadyExist = await FollowModel.findOne({
            followedId: this.followedId,
            visitorId: this.visitorId
        })
        if (action === 'create') {
            if (doesFollowAlreadyExist) {
                this.errors.push("You are already following this user.");
            }
        }
        if (action === 'delete') {
            if (!doesFollowAlreadyExist) {
                this.errors.push("You cannot stop following a user that you are not already followed.");
            }
        }
        // Prevent following self
        if (this.followedId.equals(this.visitorId)) {
            this.errors.push("You cannot follow yourself.")
        }
    }
    async isVisitorFollowing() {
        await this.validate();
        let followDoc = await FollowModel.findOne({
            followedId: this.followedId,
            visitorId: this.visitorId
        });
        if (followDoc) {
            return true;
        } else {
            return false;
        }
    }
    getFollowingsById() {
        return new Promise(async (resolve, reject) => {
            try {
                // followedUsername must exist in the database.
                let followedAccount = await UserModel.findOne({ username: this.followedUsername })
                if (followedAccount) {
                    this.followedId = followedAccount._id;
                }
                let followings = await FollowModel.aggregate([
                    { $match: { visitorId: this.followedId } },
                    { $lookup: { from: "users", localField: "followedId", foreignField: "_id", as: "userDoc" } },
                    {
                        $project: {
                            username: { $arrayElemAt: ["$userDoc.username", 0] },
                            email: { $arrayElemAt: ["$userDoc.email", 0] }
                        }
                    }
                ]);
                followings = followings.map((following) => {
                    // Create a user
                    let user = new User(following, true);
                    return { username: following.username, avatar: user.avatar };
                })
                resolve(followings);
            } catch {
                reject();
            }
        })
    }
    getFollowersById() {
        return new Promise(async (resolve, reject) => {
            try {
                // followedUsername must exist in the database.
                let followedAccount = await UserModel.findOne({ username: this.followedUsername })
                if (followedAccount) {
                    this.followedId = followedAccount._id;
                }
                let followers = await FollowModel.aggregate([
                    { $match: { followedId: this.followedId } },
                    { $lookup: { from: "users", localField: "visitorId", foreignField: "_id", as: "userDoc" } },
                    {
                        $project: {
                            username: { $arrayElemAt: ["$userDoc.username", 0] },
                            email: { $arrayElemAt: ["$userDoc.email", 0] }
                        }
                    }
                ]);
                followers = followers.map((follower) => {
                    // Create a user
                    let user = new User(follower, true);
                    return { username: follower.username, avatar: user.avatar };
                })
                resolve(followers);
            } catch {
                reject();
            }
        })
    }
    countFollowersById(id) {
        return new Promise(async (resolve, reject) => {
            let followersCount = await FollowModel.countDocuments({
                followedId: id
            })
            resolve(followersCount);
        })
    }
    countFollowingsById(id) {
        return new Promise(async (resolve, reject) => {
            let followingsCount = await FollowModel.countDocuments({
                visitorId: id
            })
            resolve(followingsCount);
        })
    }
}

export default Follow;