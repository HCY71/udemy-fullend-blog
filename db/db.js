import 'dotenv/config';
import mongoose from 'mongoose';

const URI = process.env.URI;

mongoose.connect(URI)
    .then(() => {
        console.log('Mongoose connection success');
    });
