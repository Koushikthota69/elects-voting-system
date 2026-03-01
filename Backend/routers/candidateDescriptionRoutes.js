const express = require("express");
const router = express.Router();
const CandidateDescription = require("../models/candidateDescription");
const Candidate = require("../models/candidate");

// ✅ FIXED: Create (Add) Description
router.post("/add/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const { description } = req.body;

        if (!description) {
            return res.status(400).json({ error: "Description is required" });
        }

        // Find candidate by user ID
        const candidate = await Candidate.findOne({ user: userId });
        if (!candidate) {
            return res.status(404).json({ error: "Candidate not found" });
        }

        // Check if description already exists
        let existingDescription = await CandidateDescription.findOne({ user: userId });

        if (existingDescription) {
            // Update existing description
            existingDescription.description = description;
            await existingDescription.save();
            return res.status(200).json({
                message: "Description updated successfully",
                data: existingDescription
            });
        } else {
            // Create new description
            const newDescription = new CandidateDescription({
                user: userId,
                candidate: candidate._id,
                description: description
            });
            await newDescription.save();
            return res.status(201).json({
                message: "Description added successfully",
                data: newDescription
            });
        }
    } catch (error) {
        console.error("Error in add description:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ FIXED: Read (View) Description by User ID
router.get("/view/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;

        const description = await CandidateDescription.findOne({ user: userId });

        if (!description) {
            return res.status(200).json({
                description: "No description available."
            });
        }

        res.status(200).json({
            description: description.description
        });
    } catch (error) {
        console.error("Error in view description:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ FIXED: Update Description
router.put("/edit/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const { description } = req.body;

        if (!description) {
            return res.status(400).json({ error: "Description is required" });
        }

        const updatedDescription = await CandidateDescription.findOneAndUpdate(
            { user: userId },
            { description: description },
            { new: true, upsert: true }
        );

        res.status(200).json({
            message: "Description updated successfully",
            data: updatedDescription
        });
    } catch (error) {
        console.error("Error in edit description:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ FIXED: Delete Description
router.delete("/delete/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;

        const deletedDescription = await CandidateDescription.findOneAndDelete({ user: userId });

        if (!deletedDescription) {
            return res.status(404).json({ error: "Description not found" });
        }

        res.status(200).json({ message: "Description deleted successfully" });
    } catch (error) {
        console.error("Error in delete description:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;