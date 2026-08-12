const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { sendContactMessage } = require('../controllers/contactController');

const validateContact = [
  body('name').trim().notEmpty(),
  body('email').isEmail(),
  body('message').trim().isLength({ min: 5 }),
];

router.post('/', validateContact, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Please check your form and try again.', errors: errors.array() });
  }
  next();
}, sendContactMessage);

module.exports = router;
