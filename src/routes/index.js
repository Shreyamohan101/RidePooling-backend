const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const rideRoutes = require('./ride.routes');
const poolRoutes = require('./pool.routes');

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use('/rides', rideRoutes);
router.use('/pools', poolRoutes);

module.exports = router;