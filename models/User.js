import bcrypt from "bcryptjs";
import validator from "validator";
import UserModel from "../db/schema/UserSchema.js";
import md5 from 'md5';

class User {
    constructor(data={}, getAvatar) {
        this.data = data;
        this.errors = [];
        if (getAvatar == undefined) {
            getAvatar = false;
        }
        if (getAvatar) {
            this.getAvatar();
        }
    }
    register() {
        return new Promise(async (resolve, reject) => {
            // Step 1: Validate user data
            this.cleanUp();
            await this.validate();

            // Step 2: Save the data when no error
            if (!this.errors.length) {
                // Hash user password
                let salt = bcrypt.genSaltSync(10);
                this.data.password = bcrypt.hashSync(this.data.password, salt);
                await UserModel.create(this.data);

                this.getAvatar();

                resolve();
            } else {
                reject(this.errors);
            }
        })
    }
    login() {
        return new Promise((resolve, reject) => {
            this.cleanUp();
            UserModel.findOne({ username: this.data.username }).then((attemptedUser) => {
                if (attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
                    this.data = attemptedUser;
                    this.getAvatar();
                    resolve("Congrats");
                } else {
                    reject("Invalid username/password");
                }
            }).catch((e) => {
                reject("Some server errors occur, please try again or give it up.")
            })
        });
    }
    validate() {
        return new Promise(async (resolve, reject) => {
            if (this.data.username === "") {
                this.errors.push("You must provide a username.")
            }
            else if (this.data.username.length !== "" && !validator.isAlphanumeric(this.data.username)) {
                this.errors.push("Username can only contain letters and numbers.")
            }
            else if (this.data.username.length > 0 && this.data.username.length < 3) {
                this.errors.push("Username must be at least 3 characters.");
            }
            else if (this.data.username.length > 30) {
                this.errors.push("Username can not exceed 30 characters.");
            }
            if (!validator.isEmail(this.data.email)) {
                this.errors.push("You must provide a valid email address.")
            }
            if (this.data.password === "") {
                this.errors.push("You must provide the password.")
            }
            else if (this.data.password.length > 0 && this.data.password.length < 12) {
                this.errors.push("The password must be at least 12 characters.")
            }
            else if (this.data.password.length > 50) {
                this.errors.push("Password can not exceed 50 characters.");
            }

            // Check if username is already taken
            if (this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
                let usernameExists = await UserModel.findOne({ username: this.data.username });
                if (usernameExists) this.errors.push("Username has already taken");
            }

            // Check if email is already taken
            if (validator.isEmail(this.data.email)) {
                let emailExists = await UserModel.findOne({ email: this.data.email });
                if (emailExists) this.errors.push("Email has already been used.");
            }
            resolve();
        });
    }
    cleanUp() {
        if (typeof (this.data.username) != "string") {
            this.data.username = "";
        }
        if (typeof (this.data.email) != "string") {
            this.data.email = "";
        }
        if (typeof (this.data.password) != "string") {
            this.data.password = "";
        }

        // Get rid of unwanted properties(like define schema)
        this.data = {
            username: this.data.username.trim().toLowerCase(),
            email: this.data.email.trim().toLowerCase(),
            password: this.data.password
        }
    }
    getAvatar() {
        this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`;
    }
    findByUsername(username) {
        return new Promise((resolve, reject) => {
            if (typeof(username) !== 'string') {
                reject();
                return
            }
            UserModel.findOne({
                username: username
            }).then((userDoc) => {
                if (userDoc) {
                    userDoc = new User(userDoc, true);
                    userDoc = {
                        _id: userDoc.data._id,
                        username: userDoc.data.username,
                        avatar: userDoc.avatar
                    };
                    resolve(userDoc);
                } else {
                    reject();
                }
            }).catch(() => {
                reject();
            })
        })
    }
    doesEmailExist(email) {
        return new Promise(async (resolve, reject) => {
            if (typeof(email) !== "string") {
                resolve(false);
                return;
            }
            let user = await UserModel.findOne({email: email});
            if (user) {
                resolve(true);
            } else {
                resolve(false);
            }
        })
    }
}

export default User;