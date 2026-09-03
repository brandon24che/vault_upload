import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getDb, saveDb, hashPassword, UPLOADS_DIR, FileRecord, UserRecord } from './db.js';
import { requireAuth, AuthenticatedRequest, generateToken, revokeToken, sanitizeUser } from './auth.js';

const router = Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req: AuthenticatedRequest, file, cb) => {
    const userId = req.user?.id || 'anonymous';
    const userDir = path.join(UPLOADS_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// Limit file size to 100MB
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

// Determine category based on MIME type or extension
function categorizeFile(mimeType: string, filename: string): FileRecord['category'] {
  const lowerName = filename.toLowerCase();
  if (
    mimeType.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(lowerName)
  ) {
    return 'image';
  }
  if (
    /\.(fig|sketch|xd|psd|ai|eps|indd|raw)$/i.test(lowerName) ||
    mimeType.includes('photoshop') ||
    mimeType.includes('illustrator')
  ) {
    return 'design';
  }
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType.includes('presentation') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('text/') ||
    /\.(pdf|doc|docx|txt|md|rtf|xls|xlsx|csv|ppt|pptx)$/i.test(lowerName)
  ) {
    return 'document';
  }
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('compressed') ||
    mimeType.includes('archive') ||
    /\.(zip|rar|7z|tar|gz)$/i.test(lowerName)
  ) {
    return 'archive';
  }
  if (
    mimeType.startsWith('audio/') ||
    mimeType.startsWith('video/') ||
    /\.(mp3|wav|ogg|mp4|mov|avi|mkv|webm)$/i.test(lowerName)
  ) {
    return 'media';
  }
  return 'other';
}

// ---------------- AUTH ROUTES ----------------

// Sign up
router.post('/auth/signup', (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();

  const existing = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
  }

  const { hash, salt } = hashPassword(password);
  const newUser: UserRecord = {
    id: 'user-' + crypto.randomUUID(),
    email: normalizedEmail,
    name: name.trim(),
    role: role === 'client' ? 'client' : 'freelancer',
    passwordHash: hash,
    salt,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDb(db);

  const token = generateToken(newUser.id);
  res.status(201).json({
    user: sanitizeUser(newUser),
    token,
  });
});

// Sign in
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter your email and password.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();

  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
  }

  const { hash } = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
  }

  const token = generateToken(user.id);
  res.json({
    user: sanitizeUser(user),
    token,
  });
});

// Current User info
router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// Logout
router.post('/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    revokeToken(token);
  }
  res.json({ success: true, message: 'Signed out successfully.' });
});

// ---------------- FILE ROUTES ----------------

// List all files belonging to authenticated user
router.get('/files', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const db = getDb();

  let userFiles = db.files.filter(f => f.userId === userId);

  // Filter by category
  const { category, search } = req.query;
  if (category && typeof category === 'string' && category !== 'all') {
    userFiles = userFiles.filter(f => f.category === category);
  }

  // Filter by search term
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase();
    userFiles = userFiles.filter(
      f =>
        f.originalName.toLowerCase().includes(q) ||
        (f.clientTag && f.clientTag.toLowerCase().includes(q))
    );
  }

  // Sort by newest first by default
  userFiles.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

  res.json({ files: userFiles });
});

// Upload new file (Single or Multi)
router.post(
  '/files/upload',
  requireAuth,
  upload.single('file'),
  (req: AuthenticatedRequest, res: Response) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided for upload.' });
    }

    const userId = req.user!.id;
    const clientTag = (req.body.clientTag || '').trim();
    const category = categorizeFile(file.mimetype, file.originalname);

    const newFileRecord: FileRecord = {
      id: 'file-' + crypto.randomUUID(),
      userId,
      originalName: file.originalname,
      storedFileName: file.filename,
      mimeType: file.mimetype || 'application/octet-stream',
      size: file.size,
      uploadDate: new Date().toISOString(),
      clientTag: clientTag || undefined,
      category,
    };

    const db = getDb();
    db.files.push(newFileRecord);
    saveDb(db);

    res.status(201).json({
      message: 'File uploaded successfully.',
      file: newFileRecord,
    });
  }
);

// Secure File Download (checks user ownership)
router.get('/files/:id/download', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDb();

  const fileRecord = db.files.find(f => f.id === id);
  if (!fileRecord) {
    return res.status(404).json({ error: 'File not found.' });
  }

  // Security enforcement: Users can only download their own files unless Admin
  const isAdmin = req.user?.id === 'OP8cEaPrWJcWPuT5PSxGD3Efacn1' || req.user?.role === 'admin';
  if (fileRecord.userId !== userId && !isAdmin) {
    return res.status(403).json({ error: 'Access denied. You do not have permission to download this file.' });
  }

  const filePath = path.join(UPLOADS_DIR, fileRecord.userId, fileRecord.storedFileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Physical file not found on server.' });
  }

  res.download(filePath, fileRecord.originalName);
});

// Secure File Preview (inline viewing for images, PDFs, text)
router.get('/files/:id/preview', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDb();

  const fileRecord = db.files.find(f => f.id === id);
  if (!fileRecord) {
    return res.status(404).json({ error: 'File not found.' });
  }

  // Security enforcement: Users can only preview their own files unless Admin
  const isAdmin = req.user?.id === 'OP8cEaPrWJcWPuT5PSxGD3Efacn1' || req.user?.role === 'admin';
  if (fileRecord.userId !== userId && !isAdmin) {
    return res.status(403).json({ error: 'Access denied. You do not have permission to view this file.' });
  }

  const filePath = path.join(UPLOADS_DIR, fileRecord.userId, fileRecord.storedFileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Physical file not found on server.' });
  }

  res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileRecord.originalName)}"`);
  res.sendFile(filePath);
});

// Delete file (checks user ownership)
router.delete('/files/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const db = getDb();

  const fileIndex = db.files.findIndex(f => f.id === id);
  if (fileIndex === -1) {
    return res.status(404).json({ error: 'File not found.' });
  }

  const fileRecord = db.files[fileIndex];

  // Security enforcement: Users can only delete their own files
  if (fileRecord.userId !== userId) {
    return res.status(403).json({ error: 'Access denied. You can only delete your own files.' });
  }

  // Remove physical file from disk
  const filePath = path.join(UPLOADS_DIR, fileRecord.userId, fileRecord.storedFileName);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn('Could not remove physical file from disk:', err);
  }

  // Remove metadata from database
  db.files.splice(fileIndex, 1);
  saveDb(db);

  res.json({
    success: true,
    message: `"${fileRecord.originalName}" has been safely deleted.`,
  });
});

// Storage Usage Stats for Authenticated User
router.get('/storage/stats', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const db = getDb();

  const userFiles = db.files.filter(f => f.userId === userId);
  const usedBytes = userFiles.reduce((sum, f) => sum + (f.size || 0), 0);
  const maxBytes = 500 * 1024 * 1024; // 500 MB quota per vault

  const categoryBreakdown: Record<string, number> = {
    image: 0,
    document: 0,
    design: 0,
    archive: 0,
    media: 0,
    other: 0,
  };

  userFiles.forEach(f => {
    categoryBreakdown[f.category] = (categoryBreakdown[f.category] || 0) + f.size;
  });

  res.json({
    usedBytes,
    maxBytes,
    totalFiles: userFiles.length,
    categoryBreakdown,
  });
});

// Admin: Get all users directory with live file counts
router.get('/admin/users', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userEmail = req.user?.email?.toLowerCase() || '';
  const isAdmin =
    req.user?.id === 'OP8cEaPrWJcWPuT5PSxGD3Efacn1' ||
    req.user?.role === 'admin' ||
    userEmail === 'admin@clientvault.app' ||
    userEmail === 'cheec702@gmail.com';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  const db = getDb();

  // Ensure system admin account is present in db.users
  if (!db.users.some(u => u.id === 'OP8cEaPrWJcWPuT5PSxGD3Efacn1')) {
    db.users.push({
      id: 'OP8cEaPrWJcWPuT5PSxGD3Efacn1',
      email: 'admin@clientvault.app',
      name: 'System Administrator',
      role: 'admin',
      passwordHash: '',
      salt: '',
      createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
    });
    saveDb(db);
  }

  const usersWithCounts = db.users.map(u => {
    const fileCount = db.files.filter(f => f.userId === u.id).length;
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      fileCount,
    };
  });

  // Sort: admin account at top, then newest registered users
  usersWithCounts.sort((a, b) => {
    if (a.id === 'OP8cEaPrWJcWPuT5PSxGD3Efacn1') return -1;
    if (b.id === 'OP8cEaPrWJcWPuT5PSxGD3Efacn1') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  res.json({ users: usersWithCounts });
});

// Admin: Get files for a specific user
router.get('/admin/users/:userId/files', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userEmail = req.user?.email?.toLowerCase() || '';
  const isAdmin =
    req.user?.id === 'OP8cEaPrWJcWPuT5PSxGD3Efacn1' ||
    req.user?.role === 'admin' ||
    userEmail === 'admin@clientvault.app' ||
    userEmail === 'cheec702@gmail.com';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  const { userId } = req.params;
  const db = getDb();
  const userFiles = db.files.filter(f => f.userId === userId);
  res.json({ files: userFiles });
});

// Admin: Delete user from system (with cascade file cleanup)
router.delete('/admin/users/:userId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userEmail = req.user?.email?.toLowerCase() || '';
  const isAdmin =
    req.user?.id === 'OP8cEaPrWJcWPuT5PSxGD3Efacn1' ||
    req.user?.role === 'admin' ||
    userEmail === 'admin@clientvault.app' ||
    userEmail === 'cheec702@gmail.com';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  const { userId } = req.params;

  // Protect system admin account from deletion
  if (userId === 'OP8cEaPrWJcWPuT5PSxGD3Efacn1') {
    return res.status(400).json({ error: 'The primary system administrator account cannot be deleted.' });
  }

  const db = getDb();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found in system directory.' });
  }

  const deletedUser = db.users[userIndex];

  // Cascade delete files belonging to this user
  const userFiles = db.files.filter(f => f.userId === userId);
  userFiles.forEach(f => {
    try {
      const filePath = path.join(UPLOADS_DIR, f.userId, f.storedFileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn(`Could not delete physical file ${f.storedFileName}:`, err);
    }
  });

  // Try to remove user folder if empty or exists
  try {
    const userDir = path.join(UPLOADS_DIR, userId);
    if (fs.existsSync(userDir)) {
      fs.rmSync(userDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn(`Could not delete user directory:`, err);
  }

  // Remove records from database
  db.files = db.files.filter(f => f.userId !== userId);
  db.users.splice(userIndex, 1);
  saveDb(db);

  res.json({
    success: true,
    message: `User ${deletedUser.email} and ${userFiles.length} file(s) have been deleted.`,
    deletedUserId: userId,
  });
});

export default router;
