import router from './router.js';
import express from 'express';
import session from 'express-session';
// import MongoStore from 'connect-mongo';
import './db/db.js';
import flash from 'connect-flash';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { createServer } from 'http';
import { Server } from 'socket.io';
import csrf from 'csurf';
import routerApi from './router-api.js';

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/api', routerApi);


const sessionOptions = session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true }
})
app.use(sessionOptions);
app.use(flash());

app.use((req, res, next) => {
    // Make markdown available from within the ejs.
    res.locals.filterUserHTML = (content) => {
        return sanitizeHtml(marked.parse(content), {
            allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'bold', 'i', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
            allowedAttributes: {}
        });
    }

    // Make all errors and successful messages available.
    res.locals.errors = req.flash('errors');
    res.locals.success = req.flash('success');

    // Make current user id available on req object
    if (req.session.user) {
        req.visitorId = req.session.user._id;
    } else {
        req.visitorId = 0;
    }

    // Make user session data globally available.
    res.locals.user = req.session.user;

    next();
});


app.use(express.static('public'));

app.set('views', 'static');
app.set('view engine', 'ejs');

app.use(csrf());

app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
})
app.use('/', router);

app.use((err, req, res, next) => {
    if (err) {
        if (err.code === 'EBADCSRFTOKEN') {
            req.flash('errors', 'Cross site request forgery detected.');
            req.session.save(() => res.redirect('/'));
        } else {
            res.render('404');
        }
    }
})

const httpServer = createServer(app);
const io = new Server(httpServer);

io.use((socket, next) => {
    sessionOptions(socket.request, socket.request.res, next);
})

io.on('connection', (socket) => {
    if (socket.request.session.user) {
        let user = socket.request.session.user;
        socket.emit('welcome', {
            user: user
        })
        socket.on('chatMessageFromBrowser', (data) => {
            socket.broadcast.emit('chatMessageFromServer', { 
                message: sanitizeHtml(data.message, {allowedTags: [], allowedAttributes: []}),
                user: user
            });
        });
    }
})

httpServer.listen(3000);
