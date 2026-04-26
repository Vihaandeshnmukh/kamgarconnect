const express = require('express');
const router = express.Router();
const Timeline = require('../models/Timeline');

// TODO BEFORE PRODUCTION:
// 1. Add back user type checks
// 2. Remove testing mode banner

// GET /api/timeline - Get all timeline entries
router.get('/', async (req, res) => {
    try {
        const entries = await Timeline.find().sort({ createdAt: 1 });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/timeline - Add new entry (protected by header for testing)
router.post('/', async (req, res) => {
    const accessCode = req.header('x-access-code');
    if (accessCode !== 'KAMGAR2025PLAN') {
        return res.status(401).json({ msg: 'Unauthorized' });
    }
    try {
        const newEntry = new Timeline(req.body);
        const entry = await newEntry.save();
        res.json(entry);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/timeline/mindmap - Structured data for SVG mindmap
router.get('/mindmap', async (req, res) => {
    try {
        // Structured static nodes with branch data
        const data = {
            center: { id: 'root', name: 'Kamgar Connect', color: '#FF5C00' },
            branches: [
                {
                    id: 'frontend', name: 'Frontend', color: '#3b82f6',
                    nodes: ['Homepage', 'Videos', 'Animations', 'Languages', 'Secret Page', 'Profile Corner']
                },
                {
                    id: 'backend', name: 'Backend', color: '#10b981',
                    nodes: ['Node.js Express', 'MongoDB Atlas', 'Railway Hosting', 'JWT Auth', 'Socket.IO']
                },
                {
                    id: 'calling', name: 'Calling System', color: '#a855f7',
                    nodes: ['Worker Registration Call', 'Job Assignment Call', 'Hindi Marathi English Voice', 'Twilio Integration']
                },
                {
                    id: 'mobile', name: 'Mobile App', color: '#14b8a6',
                    nodes: ['Expo React Native', 'iOS Android Web', 'All Screens', 'Availability Toggle']
                },
                {
                    id: 'team', name: 'Team', color: '#fbbf24',
                    nodes: ['Vihaan Deshmukh CEO', 'Joel Koddikar CTO', 'Aayush Jadhav Co-Founder']
                },
                {
                    id: 'future', name: 'Future Plans', color: '#FF5C00',
                    nodes: ['Trust Score', 'Employer Wallet', 'Worker Referral Bonus', 'Job History Roots', 'SOS Button', 'Voice Reviews', 'Demand Alerts', 'Live Heatmap']
                }
            ]
        };
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
