import express from "express";
import * as userController from './controllers/userController.js';
import * as postController from './controllers/postController.js';
import * as followController from './controllers/followController.js';

const routerApi = express.Router();

routerApi.post('/login', userController.apiLogin);
routerApi.post('/create-post', userController.apiMustBeLoggedIn, postController.apiCreate);
routerApi.delete('/post/:id', userController.apiMustBeLoggedIn, postController.apiDelete);
routerApi.get('/postsByAuthor/:username', userController.apiGetPostsByUsername);

export default routerApi;