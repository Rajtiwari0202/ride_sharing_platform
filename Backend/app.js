// 1. Load env variables FIRST before importing ANYTHING else
const dotenv = require('dotenv');
dotenv.config();

const express = require("express");
const cors = require('cors');
const app = express();
const userRoutes = require('./routes/user.routes')
// 2. Import your DB function AFTER dotenv has configured everything
const { connectToDb } = require('./db/db'); 
connectToDb();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true})); 
app.use('/users',userRoutes);

app.get("/", (req, res) => {
    res.send("Hello world");
});

module.exports = app;
