const jwt = require('jsonwebtoken');
const User = require('../models/mysql/User.model');

// ─── Authenticate JWT ─────────────────────────────────────────────────────────
exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No access token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password_hash', 'two_fa_secret', 'verification_token'] },
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = { userId: user.id, email: user.email, name: user.name, ...decoded };
    req.userRecord = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid access token' });
  }
};

// ─── Optional Auth (doesn't fail if no token) ────────────────────────────────
exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);
      if (user?.is_active) {
        req.user = { userId: user.id, email: user.email, name: user.name };
      }
    }
  } catch (err) { /* ignore */ }
  next();
};

// ─── RBAC: Require Project Role ───────────────────────────────────────────────
const Project = require('../models/mongo/Project.model');

exports.requireProjectRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id || req.body.project_id;
      if (!projectId) return res.status(400).json({ error: 'Project ID required' });

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      // Owner always has access
      if (project.owner_id === req.user.userId) {
        req.project = project;
        return next();
      }

      const member = project.members.find(m => m.user_id === req.user.userId);
      if (!member) return res.status(403).json({ error: 'Not a project member' });

      if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
        return res.status(403).json({ error: `Role '${member.role}' not authorized. Required: ${allowedRoles.join(', ')}` });
      }

      req.project = project;
      req.projectRole = member.role;
      next();
    } catch (err) {
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

// ─── Is Project Owner or Admin ─────────────────────────────────────────────────
exports.isProjectOwner = exports.requireProjectRole('admin');

// ─── Global Admin Check ────────────────────────────────────────────────────────
exports.requireAdmin = (req, res, next) => {
  if (req.userRecord?.preferences?.is_admin) return next();
  return res.status(403).json({ error: 'Admin access required' });
};
