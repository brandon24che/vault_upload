import { User, VaultFile, StorageStats, AuthResponse } from '../types.ts';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  firebaseSignOut,
  FirebaseUser 
} from './firebase.ts';
import { 
  ADMIN_USER_ID, 
  syncUserToFirestore, 
  syncFileToFirestore, 
  syncDeleteFileFromFirestore 
} from './firestoreService.ts';

const TOKEN_KEY = 'clientvault_token';
const USER_KEY = 'clientvault_user';

export function mapFirebaseUser(user: FirebaseUser): User {
  const email = (user.email || '').toLowerCase();
  const name = user.displayName || (email ? email.split('@')[0] : 'User');
  const isAdmin = user.uid === ADMIN_USER_ID || email === 'admin@clientvault.app' || email === 'cheec702@gmail.com';
  return {
    id: user.uid,
    email: user.email || email,
    name: name,
    role: isAdmin ? 'admin' : 'freelancer',
    createdAt: user.metadata?.creationTime || new Date().toISOString(),
  };
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export function setSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const userEmail = credential.user.email?.toLowerCase() || '';
    const isDemo = userEmail === 'alex@designer.studio' || userEmail === 'sarah@acme.inc';
    const isGoogle = credential.user.providerData.some(p => p.providerId === 'google.com');

    // Email verification check: user must verify before login
    if (!credential.user.emailVerified && !isDemo && !isGoogle) {
      await firebaseSignOut(auth);
      clearSession();
      const err = new Error('Please verify your email before logging in. We sent a verification link to your email.');
      (err as unknown as { requiresVerification: boolean; email: string }).requiresVerification = true;
      (err as unknown as { requiresVerification: boolean; email: string }).email = credential.user.email || email;
      throw err;
    }

    const token = await credential.user.getIdToken();
    const user = mapFirebaseUser(credential.user);
    setSession(token, user);
    syncUserToFirestore(user).catch(() => {});
    return { user, token };
  } catch (err: unknown) {
    if ((err as { requiresVerification?: boolean })?.requiresVerification) {
      throw err;
    }
    const errorObj = err as { code?: string; message?: string };
    const code = errorObj?.code || '';
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found' ||
      code === 'auth/invalid-email' ||
      code === 'auth/invalid-login-credentials'
    ) {
      throw new Error('Email or password is incorrect');
    }
    throw new Error(errorObj?.message || 'Email or password is incorrect');
  }
}

export async function registerWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; email: string }> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    // Send email verification link
    await sendEmailVerification(credential.user);
    // Immediately sign out so user cannot log in until email is verified
    await firebaseSignOut(auth);
    clearSession();
    return { success: true, email: credential.user.email || email };
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    const code = errorObj?.code || '';
    if (
      code === 'auth/email-already-in-use' || 
      code === 'auth/email-already-exists' ||
      errorObj?.message?.includes('email-already-in-use')
    ) {
      throw new Error('User already exists. Please sign in');
    }
    if (code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters.');
    }
    if (code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    }
    throw new Error(errorObj?.message || 'Failed to create account.');
  }
}

export async function signup(
  email: string,
  password: string
): Promise<{ requiresVerification: boolean; email: string }> {
  const result = await registerWithEmail(email, password);
  return { requiresVerification: true, email: result.email };
}

export async function resendVerificationEmail(email: string, password?: string): Promise<void> {
  try {
    if (password) {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(credential.user);
      await firebaseSignOut(auth);
    } else {
      throw new Error('Password is required to resend verification email.');
    }
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj?.code === 'auth/too-many-requests') {
      throw new Error('Too many requests sent. Please check your inbox or wait a few minutes.');
    }
    throw new Error(errorObj?.message || 'Failed to resend verification email.');
  }
}

export async function loginWithGoogle(): Promise<AuthResponse> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    const token = await credential.user.getIdToken();
    const user = mapFirebaseUser(credential.user);
    setSession(token, user);
    syncUserToFirestore(user).catch(() => {});
    return { user, token };
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    const code = errorObj?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error('Google authentication was cancelled.');
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('The Google sign-in popup was blocked by your browser. Please allow popups.');
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not yet authorized in Firebase Console (Authentication > Settings > Authorized domains).');
    }
    throw new Error(errorObj?.message || 'Failed to connect with Google.');
  }
}


export async function logout(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.error('Firebase sign out error:', err);
  } finally {
    clearSession();
  }
}

export async function getCurrentUser(): Promise<User | null> {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    const user = mapFirebaseUser(auth.currentUser);
    setSession(token, user);
    return user;
  }
  return getStoredUser();
}

export async function fetchFiles(params?: { search?: string; category?: string }): Promise<VaultFile[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.category && params.category !== 'all') query.set('category', params.category);

  const response = await fetch(`/api/files?${query.toString()}`, {
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Could not load your vault files.');
  }

  return data.files;
}

export async function uploadFile(
  file: File,
  clientTag?: string,
  onProgress?: (percent: number) => void
): Promise<VaultFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    if (clientTag) formData.append('clientTag', clientTag);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          syncFileToFirestore(res.file).catch(() => {});
          resolve(res.file);
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          reject(new Error(res.error || 'File upload failed.'));
        } catch {
          reject(new Error('File upload failed.'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during file upload.'));
    });

    xhr.open('POST', '/api/files/upload');
    const token = getStoredToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });
}

export async function deleteFile(id: string): Promise<void> {
  const response = await fetch(`/api/files/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Could not delete file.');
  }

  const user = getStoredUser();
  if (user) {
    syncDeleteFileFromFirestore(id, user.id).catch(() => {});
  }
}

export async function loginAsAdmin(): Promise<AuthResponse> {
  const adminUser: User = {
    id: ADMIN_USER_ID,
    email: 'admin@clientvault.app',
    name: 'Administrator',
    role: 'admin',
    createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
  };
  const token = 'demo-token-admin';
  setSession(token, adminUser);
  syncUserToFirestore(adminUser).catch(() => {});
  return { user: adminUser, token };
}

export async function fetchStorageStats(): Promise<StorageStats> {
  const response = await fetch('/api/storage/stats', {
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Could not retrieve storage metrics.');
  }

  return data;
}

export async function downloadFile(id: string, originalName: string): Promise<void> {
  const response = await fetch(`/api/files/${id}/download`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Download failed' }));
    throw new Error(data.error || 'Download failed');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = originalName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function getFilePreviewUrl(id: string): string {
  // Since preview endpoint needs auth header in standard fetch, we can provide a helper
  return `/api/files/${id}/preview`;
}
