const DeviceToken = require('../models/DeviceToken');

exports.registerToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const [record, created] = await DeviceToken.upsert({
      userId,
      token,
      platform: platform || 'android',
    });
    res.json({ success: true, created });
  } catch (err) {
    console.error('Register token error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.unregisterToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });
    await DeviceToken.destroy({ where: { token } });
    res.json({ success: true });
  } catch (err) {
    console.error('Unregister token error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getUserTokens = async (userId) => {
  try {
    const tokens = await DeviceToken.findAll({
      where: { userId },
      attributes: ['token', 'platform'],
    });
    return tokens.map(t => t.token);
  } catch {
    return [];
  }
};
