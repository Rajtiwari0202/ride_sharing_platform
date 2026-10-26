const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();

const userRoutes = require('./routes/user.routes');
const captainRoutes = require('./routes/captain.routes');
const { connectToDb } = require('./db/db'); 

connectToDb();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/users', userRoutes);
app.use('/captains', captainRoutes);

app.get('/', (req, res) => {
    res.send('Uber API is running');
});

module.exports = app;
