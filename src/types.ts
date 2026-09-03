export interface User {
  id: string;
  email: string;
  name: string;
  role: 'freelancer' | 'client' | 'admin';
  createdAt: string;
}

export interface FirestoreUser {
  id: string;
  email: string;
  name?: string;
  role?: 'freelancer' | 'client' | 'admin';
  createdAt: string;
  fileCount?: number;
}

export interface VaultFile {
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

export interface StorageStats {
  usedBytes: number;
  maxBytes: number;
  totalFiles: number;
  categoryBreakdown: Record<string, number>;
}

export interface AuthResponse {
  user: User;
  token: string;
}
