const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { getRsvps, getSubscribers, getTransactions } = require('../controllers/adminController');

router.use(requireAuth); // every route below requires a logged-in admin

router.get('/rsvps', getRsvps);
router.get('/subscribers', getSubscribers);
router.get('/transactions', getTransactions);

module.exports = router;
