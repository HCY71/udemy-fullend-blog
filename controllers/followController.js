import Follow from '../models/Follow.js';

export const addFollow = (req, res) => {
    let follow = new Follow(req.params.username, req.visitorId);
    follow.create()
        .then(() => {
            req.flash('success', `Successfully followed ${req.params.username}`);
            req.session.save(() => res.redirect(`/profile/${req.params.username}`));
        })
        .catch((errors) => {
            errors.forEach((e) => req.flash('errors', e));
            req.session.save(() => res.redirect('/'));
        });
}

export const removeFollow = (req, res) => {
    let follow = new Follow(req.params.username, req.visitorId);
    follow.delete()
        .then(() => {
            req.flash('success', `Successfully stopped following ${req.params.username}`);
            req.session.save(() => res.redirect(`/profile/${req.params.username}`));
        })
        .catch((errors) => {
            errors.forEach((e) => req.flash('errors', e));
            req.session.save(() => res.redirect('/'));
        });
}