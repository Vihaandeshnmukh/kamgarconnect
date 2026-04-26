// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const { sendPushNotification } = require('../utils/notifications');

// PUT /api/workers/:id/push-token
router.put('/workers/:id/push-token', async (req, res) => {
  try {
    const { push_token } = req.body;
    await Worker.findByIdAndUpdate(req.params.id, { push_token });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// PUT /api/employers/:id/push-token
router.put('/employers/:id/push-token', async (req, res) => {
  try {
    const { push_token } = req.body;
    await Employer.findByIdAndUpdate(req.params.id, { push_token });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /api/notifications/send (Admin manual send)
router.post('/send', async (req, res) => {
  try {
    const { userId, userType, title, body, data } = req.body;
    
    let user;
    if (userType === 'worker') {
      user = await Worker.findById(userId);
    } else {
      user = await Employer.findById(userId);
    }

    if (!user || !user.push_token) {
      return res.status(404).json({ error: 'User or Push Token not found' });
    }

    await sendPushNotification(user.push_token, title, body, data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;

