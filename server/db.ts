import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  role: 'freelancer' | 'client' | 'admin';
  createdAt: string;
}

export interface FileRecord {
  id: string;
  userId: string;
  originalName: string;
  storedFileName: string;
  mimeType: string;
  size: number;
  uploadDate: string;
  clientTag?: string;
  category: 'image' | 'document' | 'design' | 'archive' | 'media' | 'other';
}

interface DatabaseSchema {
  users: UserRecord[];
  files: FileRecord[];
}

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const UPLOADS_DIR = isVercel ? path.join('/tmp', 'uploads') : path.join(process.cwd(), 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BUNDLED_DB_FILE = path.join(process.cwd(), 'data', 'db.json');

// Ensure directories exist
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Directory creation notice:', e);
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const userSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, userSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: userSalt };
}

function initDb(): DatabaseSchema {
  const targetFile = fs.existsSync(DB_FILE) ? DB_FILE : (fs.existsSync(BUNDLED_DB_FILE) ? BUNDLED_DB_FILE : null);
  if (targetFile) {
    try {
      const data = fs.readFileSync(targetFile, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read db.json, creating new database', e);
    }
  }

  // Pre-seed demo users
  const alexPass = hashPassword('vault123');
  const sarahPass = hashPassword('client123');

  const demoUsers: UserRecord[] = [
    {
      id: 'user-freelancer-1',
      email: 'alex@designer.studio',
      name: 'Alex Rivera',
      role: 'freelancer',
      passwordHash: alexPass.hash,
      salt: alexPass.salt,
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 'user-client-1',
      email: 'sarah@acme.inc',
      name: 'Sarah Chen (Acme)',
      role: 'client',
      passwordHash: sarahPass.hash,
      salt: sarahPass.salt,
      createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 'OP8cEaPrWJcWPuT5PSxGD3Efacn1',
      email: 'admin@clientvault.app',
      name: 'System Administrator',
      role: 'admin',
      passwordHash: alexPass.hash,
      salt: alexPass.salt,
      createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  // Seed initial sample files for demo users
  const initialFiles: FileRecord[] = [
    {
      id: 'file-demo-1',
      userId: 'user-freelancer-1',
      originalName: 'Brand_Guidelines_2026_Final.pdf',
      storedFileName: 'sample_brand_guidelines.pdf',
      mimeType: 'application/pdf',
      size: 3450000, // ~3.45 MB
      uploadDate: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      clientTag: 'Acme Rebrand',
      category: 'document',
    },
    {
      id: 'file-demo-2',
      userId: 'user-freelancer-1',
      originalName: 'Homepage_Hero_Mockup_v4.png',
      storedFileName: 'sample_mockup.png',
      mimeType: 'image/png',
      size: 1840000, // ~1.84 MB
      uploadDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      clientTag: 'Acme Rebrand',
      category: 'image',
    },
    {
      id: 'file-demo-3',
      userId: 'user-freelancer-1',
      originalName: 'Design_System_Icons.zip',
      storedFileName: 'sample_icons.zip',
      mimeType: 'application/zip',
      size: 5200000, // ~5.2 MB
      uploadDate: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      clientTag: 'Design Tokens',
      category: 'archive',
    },
    {
      id: 'file-demo-4',
      userId: 'user-client-1',
      originalName: 'Acme_Q3_Feedback_Notes.docx',
      storedFileName: 'sample_notes.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 420000, // ~420 KB
      uploadDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      clientTag: 'Review Batch #1',
      category: 'document',
    },
    {
      id: 'file-demo-5',
      userId: 'user-client-1',
      originalName: 'Raw_Product_Photos.zip',
      storedFileName: 'sample_photos.zip',
      mimeType: 'application/zip',
      size: 14200000, // ~14.2 MB
      uploadDate: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      clientTag: 'Assets for Alex',
      category: 'archive',
    },
  ];

  // Also create placeholder files on disk for the samples so download/preview tests succeed
  try {
    for (const f of initialFiles) {
      const userDir = path.join(UPLOADS_DIR, f.userId);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      const filePath = path.join(userDir, f.storedFileName);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(
          filePath,
          `Sample content for ClientVault file: ${f.originalName}\nUploaded securely for user: ${f.userId}\nDate: ${f.uploadDate}\n\nClientVault ensures every client and freelancer has their private isolated vault.`
        );
      }
    }
  } catch (err) {
    console.error('Error creating sample file placeholders:', err);
  }

  const initialDb: DatabaseSchema = {
    users: demoUsers,
    files: initialFiles,
  };

  saveDb(initialDb);
  return initialDb;
}

let dbInstance: DatabaseSchema = initDb();

export function saveDb(data: DatabaseSchema = dbInstance) {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

export function getDb(): DatabaseSchema {
  return dbInstance;
}

export { hashPassword, UPLOADS_DIR };
