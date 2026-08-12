const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { createRsvp } = require('../controllers/rsvpController');

const validateRsvp = [
  body('eventId').notEmpty(),
  body('eventTitle').notEmpty(),
  body('name').trim().notEmpty(),
  body('email').isEmail(),
  body('phone').trim().isLength({ min: 7 }),
];

router.post('/', validateRsvp, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Please check your form and try again.', errors: errors.array() });
  }
  next();
}, createRsvp);

module.exports = router;
