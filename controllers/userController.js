import User from "../models/User.js";
import Post from "../models/Post.js";
import Follow from "../models/Follow.js";
import jwt from 'jsonwebtoken';

export const login = (req, res) => {
    let user = new User(req.body);
    user.login().then(() => {
        req.session.user = { avatar: user.avatar, username: user.data.username, _id: user.data._id };
        req.session.save(() => {
            res.redirect('/');
        })
    }).catch((e) => {
        req.flash('errors', e);
        req.session.save(() => {
            res.redirect('/');
        })
    });
}
export const logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
}
export const register = (req, res) => {
    let user = new User(req.body);
    user.register()
        .then(() => {
            req.session.user = { avatar: user.avatar, username: user.data.username, _id: user.data._id };
            req.session.save(() => {
                res.redirect('/');
            })
        })
        .catch((regErrors) => {
            regErrors.forEach((e) => {
                req.flash('regErrors', e);
            })
            req.session.save(() => {
                res.redirect('/');
            })
        });
}
export const home = async (req, res) => {
    if (req.session.user) {
        // Fetch feed of posts for current user
        let posts = await new Post().getFeed(req.session.user._id);

        res.render("home-logged-in", {
            posts: posts
        });
    } else {
        res.render('home-guest', {
            regErrors: req.flash('regErrors')
        });
    }
}
export const mustBeLoggedIn = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        req.flash("errors", "You must log in to perform the action.");
        req.session.save(() => {
            res.redirect('/');
        });
    }
}
export const ifUserExists = (req, res, next) => {
    let userInstance = new User();
    userInstance.findByUsername(req.params.username)
        .then((userDocument) => {
            req.profileUser = userDocument;
            next();
        })
        .catch(() => {
            res.render('404');
        });
}
export const profilePostsScreen = (req, res) => {
    // Ask the posts model for posts by a certain user
    const postInstance = new Post();
    postInstance.findByAuthorId(req.profileUser._id)
        .then((posts) => {
            res.render('profile-posts', {
                currentPage: "posts",
                posts: posts,
                profileUsername: req.profileUser.username,
                profileAvatar: req.profileUser.avatar,
                isFollowing: req.isFollowing,
                isVisitorsProfile: req.isVisitorsProfile,
                counts: {postsCount: req.postsCount, followersCount: req.followersCount, followingsCount: req.followingsCount},
                title: `Profile for ${req.profileUser.username}`
            });
        })
        .catch(() => {
            res.render('404');
        })
}
export const profileFollowersScreen = async (req, res) => {
    try {
        let instance = new Follow(req.profileUser.username);
        let followers = await instance.getFollowersById();
        res.render('profile-followers', {
            currentPage: "followers",
            followers: followers,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: {postsCount: req.postsCount, followersCount: req.followersCount, followingsCount: req.followingsCount}
        });
    } catch {
        res.render('404');
    }
}
export const profileFollowingScreen = async (req, res) => {
    try {
        let instance = new Follow(req.profileUser.username);
        let followings = await instance.getFollowingsById();
        res.render('profile-followings', {
            currentPage: "followings",
            followings: followings,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: {postsCount: req.postsCount, followersCount: req.followersCount, followingsCount: req.followingsCount}
        });
    } catch {
        res.render('404');
    }
}
export const sharedProfileData = async (req, res, next) => {
    let isVisitorsProfile = false;
    let isFollowing = false;
    if (req.session.user) {
        isVisitorsProfile = req.profileUser._id.equals(req.session.user._id);
        let instance = new Follow(req.params.username, req.visitorId);
        isFollowing = await instance.isVisitorFollowing();
    }
    req.isFollowing = isFollowing;
    req.isVisitorsProfile = isVisitorsProfile;

    // Retrieve posts, followers, and followings counts
    let postCountPromise = new Post().countPostsByAuthor(req.profileUser._id);
    let followersCountPromise = new Follow().countFollowersById(req.profileUser._id);
    let followingsCountPromise = new Follow().countFollowingsById(req.profileUser._id);
    let [postsCount, followersCount, followingsCount] = await Promise.all([postCountPromise, followersCountPromise, followingsCountPromise]);

    req.postsCount = postsCount;
    req.followersCount = followersCount;
    req.followingsCount = followingsCount;

    next();
}
export const doesUsernameExist = (req, res) => {
    let instance = new User();
    instance.findByUsername(req.body.username)
        .then(() => {
            res.json(true);
        })
        .catch(() => {
            res.json(false);
        })
}
export const doesEmailExist = async (req, res) => {
    let instance = new User();
    let doesEmailExist = await instance.doesEmailExist(req.body.email)
    res.json(doesEmailExist)
}
export const apiLogin = (req, res) => {
    let user = new User(req.body);
    user.login().then(() => {
        res.json(jwt.sign({_id: user.data._id}, process.env.JWTSECRET, {expiresIn: '7d'}));
    }).catch((e) => {

    });
}
export const apiMustBeLoggedIn = (req, res, next) => {
    try {
        req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET);
        next();
    } catch {
        res.json('Sorry, you must provide a valid token.');
    }
}
export const apiGetPostsByUsername = async (req, res) => {
    try {
        let instanceUser = new User();
        let authorDoc = await instanceUser.findByUsername(req.params.username);
        let instancePost = new Post();
        let posts = await instancePost.findByAuthorId(authorDoc._id);
        res.json(posts);
    } catch {
        res.json("Sorry, invalid user requested.")
    }
}


// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MjYxNTY2MjQ4ZmVmZTQyNjFiNmYzODUiLCJpYXQiOjE2NTEzOTI0MDgsImV4cCI6MTY1MTk5NzIwOH0.kwpF6WKAfFc7oyaMJzzZ6rEPzyrez7QUKWVftdmuSK4