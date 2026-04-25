const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/careercraft")
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// Schema
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    resume: Object
});

const User = mongoose.model("User", UserSchema);

// Signup
app.post("/signup", async(req, res) => {
    try {
        const { name, email, password } = req.body;

        const exist = await User.findOne({ email });
        if (exist) return res.json({ msg: "User already exists" });

        const hashed = await bcrypt.hash(password, 10);
        await User.create({ name, email, password: hashed });

        res.json({ msg: "Signup successful" });
    } catch (err) {
        res.json({ msg: "Error in signup" });
    }
});

// Login
app.post("/login", async(req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.json({ msg: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.json({ msg: "Wrong password" });

        res.json({
            msg: "Login success",
            user: { name: user.name, email: user.email }
        });
    } catch (err) {
        res.json({ msg: "Error in login" });
    }
});

// Save resume
app.post("/save-resume", async(req, res) => {
    try {
        const { email, resume } = req.body;
        await User.updateOne({ email }, { resume });
        res.json({ msg: "Resume saved" });
    } catch {
        res.json({ msg: "Error saving resume" });
    }
});

// Get resume
app.get("/get-resume/:email", async(req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });

        if (!user || !user.resume) {
            return res.json({});
        }

        res.json(user.resume);
    } catch {
        res.json({});
    }
});

// Start server
app.listen(5000, () => {
    console.log("Server running on port 5000");
});