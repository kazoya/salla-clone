// Use after requireAuth: only users with role "admin" pass, everyone else gets 403.
module.exports = function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'هذه الصفحة للمدير فقط' });
  next();
};
