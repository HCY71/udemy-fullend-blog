import Post from '../models/Post.js';

export const viewCreateScreen = (req, res) => {
    res.render('create-post');
}
export const create = (req, res) => {
    let post = new Post(req.body, req.session.user._id);
    post.create()
        .then((newId) => {
            req.flash("success", "New post successfully created.");
            req.session.save(() => res.redirect(`/posts/${newId}`))
        })
        .catch((errors) => {
            errors.forEach((e) => req.flash('errors', e));
            req.session.save(() => res.redirect(`/create-post`));
        });
}
export const viewPost = async (req, res) => {
    try {
        let instance = new Post();
        let post = await instance.findSingleById(req.params.id, req.visitorId);
        res.render('post', {
            post: post,
            title: post.title
        })
    } catch (e) {
        res.render('404');
    }
}
export const viewEdit = async (req, res) => {
    try {
        let instance = new Post();
        let post = await instance.findSingleById(req.params.id, req.visitorId);
        if (post.isVisitorOwner) {
            res.render('edit-post', {
                post: post
            });
        } else {
            req.flash('errors', "You do not have the permission to perform that action.");
            req.session.save(() => res.redirect('/'));
        }
    } catch {
        res.render('404');
    }
}
export const edit = (req, res) => {
    let post = new Post(req.body, req.visitorId, req.params.id);
    post.update()
        .then((status) => {
            // The post was successfully updated in the database
            // or user did have permission, but there were validation error
            if (status === "success") {
                // Post was updated in the db.
                req.flash("success", "Post successfully updated.");
                req.session.save(() => {
                    res.redirect(`/post/${req.params.id}/edit`)
                });
            } else {
                post.errors.forEach((error) => {
                    req.flash("errors", error);
                });
                req.session.save(() => {
                    res.redirect(`/post/${req.params.id}/edit`);
                });
            }
        })
        .catch(() => {
            // A post with requested id doesn't exits
            // or if the current visitor is not the owner of the post
            req.flash("errors", "You do not have the permission to perform the action.");
            req.session.save(() => {
                res.redirect('/');
            });
        });
}
export const deletePost = (req, res) => {
    let instance = new Post();
    instance.delete(req.params.id, req.visitorId)
        .then(() => {
            req.flash('success', "Post successfully deleted.");
            req.session.save(() => res.redirect(`/profile/${req.session.user.username}`));
        })
        .catch(() => {
            req.flash('errors', "You do not have the permission to perform that action.");
            req.session.save(() => res.redirect(`/`));
        })
}
export const search = (req, res) => {
    let instance = new Post();
    instance.search(req.body.searchTerm)
        .then((posts) => {
            res.json(posts);
        })
        .catch(() => {
            res.json();
        });

}
export const apiCreate = (req, res) => {
    let post = new Post(req.body, req.apiUser._id);
    post.create()
        .then((newId) => {
            res.json('Congrats.');
        })
        .catch((errors) => {
            res.json(errors);
        });
}
export const apiDelete = (req, res) => {
    let instance = new Post();
    instance.delete(req.params.id, req.apiUser._id)
        .then(() => {
            res.json("Successfully deleted the post.")
        }).catch(() => {
            res.json("You do not have permission to perform that action.");
        })
}
