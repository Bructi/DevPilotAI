const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const User = require('../models/sqlite/User.model');
const { Session, PasswordReset } = require('../models/sqlite/index');
const { ActivityLog } = require('../models/mongo/index');
const { sendEmail } = require('../utils/email.service');

// ─── Generate Tokens ──────────────────────────────────────────────────────────
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId, type: 'refresh', jti: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

// ─── Register ─────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const user = await User.create({ name, email, password_hash: password });
    const { accessToken, refreshToken } = generateTokens(user.id);

    await Session.create({
      user_id: user.id,
      refresh_token: refreshToken,
      device_info: req.headers['user-agent'],
      ip_address: req.ip,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await ActivityLog.create({ user_id: user.id, action: 'User registered', entity_type: 'project' });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: 'Registration successful',
      user: user.toSafeObject(),
      accessToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email, is_active: true } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = await user.comparePassword(password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user.id);

    await Session.create({
      user_id: user.id,
      refresh_token: refreshToken,
      device_info: req.headers['user-agent'],
      ip_address: req.ip,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await User.update({ last_login: new Date() }, { where: { id: user.id } });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Login successful',
      user: user.toSafeObject(),
      accessToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const session = await Session.findOne({ where: { refresh_token: token, is_revoked: false } });
    if (!session || new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user || !user.is_active) return res.status(401).json({ error: 'User not found' });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

    await session.update({ refresh_token: newRefreshToken, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken, user: user.toSafeObject() });
  } catch (err) {
    res.status(401).json({ error: 'Token refresh failed' });
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await Session.update({ is_revoked: true }, { where: { refresh_token: token } });
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

// ─── Get Current User ─────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// ─── Google OAuth Callback ────────────────────────────────────────────────────
exports.googleCallback = async (req, res) => {
  try {
    const user = req.user;
    const { accessToken, refreshToken } = generateTokens(user.id);

    await Session.create({
      user_id: user.id,
      refresh_token: refreshToken,
      device_info: req.headers['user-agent'],
      ip_address: req.ip,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/auth/callback?token=${accessToken}`);
  } catch (err) {
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
};

// ─── Forgot Password ──────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal user existence
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await PasswordReset.create({
      user_id: user.id,
      token,
      expires_at: expiresAt,
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'DevPilot AI - Password Reset',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #1e293b; margin-top: 0;">Reset Your Password</h2>
          <p style="color: #475569; line-height: 1.6;">You requested a password reset for your DevPilot AI account. Click the button below to set a new password. This link will expire in 1 hour.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #64748b; font-size: 0.875rem;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// ─── Reset Password ───────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const resetRecord = await PasswordReset.findOne({ where: { token, is_used: false } });

    if (!resetRecord || new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findByPk(resetRecord.user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.password_hash = newPassword; // Will be hashed by Sequelize hook
    await user.save();

    await resetRecord.update({ is_used: true });

    // Invalidate sessions
    await Session.update({ is_revoked: true }, { where: { user_id: user.id } });

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// ─── Sessions ────────────────────────────────────────────────────────────────
exports.getSessions = async (req, res) => {
  try {
    const sessions = await Session.findAll({ 
      where: { user_id: req.user.userId, is_revoked: false },
      order: [['created_at', 'DESC']]
    });
    res.json({ sessions });
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
};

exports.revokeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findOne({ where: { id, user_id: req.user.userId } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    await session.update({ is_revoked: true });
    res.json({ message: 'Session revoked successfully' });
  } catch (err) {
    console.error('Revoke session error:', err);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
};
