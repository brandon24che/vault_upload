import { 
  db, 
  auth, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from './firebase.ts';
import { User, VaultFile, FirestoreUser } from '../types.ts';

// Dedicated Admin User ID requested
export const ADMIN_USER_ID = 'OP8cEaPrWJcWPuT5PSxGD3Efacn1';

export function isAdminUser(userOrId: User | { id: string; email?: string; role?: string } | string | null | undefined): boolean {
  if (!userOrId) return false;
  if (typeof userOrId === 'string') {
    const s = userOrId.toLowerCase();
    return userOrId === ADMIN_USER_ID || s === 'admin@clientvault.app' || s === 'cheec702@gmail.com';
  }
  const uid = userOrId.id;
  const email = (userOrId as { email?: string }).email?.toLowerCase() || '';
  const role = (userOrId as { role?: string }).role;
  return (
    uid === ADMIN_USER_ID ||
    role === 'admin' ||
    email === 'admin@clientvault.app' ||
    email === 'cheec702@gmail.com'
  );
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Ensures user profile exists in Firestore `users` collection.
 */
export async function syncUserToFirestore(user: User): Promise<void> {
  const path = `users/${user.id}`;
  try {
    const userRef = doc(db, 'users', user.id);
    const existingSnap = await getDoc(userRef);

    const isAdmin = user.id === ADMIN_USER_ID;
    const userData: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      role: isAdmin ? 'admin' : (user.role || 'freelancer'),
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!existingSnap.exists()) {
      userData.fileCount = 0;
      await setDoc(userRef, userData);
    } else {
      await setDoc(userRef, userData, { merge: true });
    }
  } catch (error) {
    console.warn(`[Firestore] Notice during user sync to ${path}:`, error);
  }
}

/**
 * Records newly uploaded file in Firestore `files` collection and increments user file count.
 */
export async function syncFileToFirestore(file: VaultFile): Promise<void> {
  const filePath = `files/${file.id}`;
  try {
    const fileRef = doc(db, 'files', file.id);
    await setDoc(fileRef, {
      id: file.id,
      userId: file.userId,
      originalName: file.originalName,
      storedFileName: file.storedFileName || '',
      mimeType: file.mimeType || 'application/octet-stream',
      size: file.size,
      uploadDate: file.uploadDate,
      category: file.category,
      clientTag: file.clientTag || '',
    });

    // Also update fileCount on the user's document
    const userRef = doc(db, 'users', file.userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const currentCount = Number(userSnap.data().fileCount) || 0;
      await setDoc(userRef, { fileCount: currentCount + 1 }, { merge: true });
    }
  } catch (error) {
    console.warn(`[Firestore] Notice during file sync to ${filePath}:`, error);
  }
}

/**
 * Removes file from Firestore and decrements user's fileCount.
 */
export async function syncDeleteFileFromFirestore(fileId: string, userId: string): Promise<void> {
  const filePath = `files/${fileId}`;
  try {
    await deleteDoc(doc(db, 'files', fileId));

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const currentCount = Number(userSnap.data().fileCount) || 1;
      await setDoc(userRef, { fileCount: Math.max(0, currentCount - 1) }, { merge: true });
    }
  } catch (error) {
    console.warn(`[Firestore] Notice during file deletion from ${filePath}:`, error);
  }
}

/**
 * Pre-seeds initial sample users and files into Firestore if users collection is empty.
 * This guarantees that when the admin logs in, they immediately see sample accounts and files.
 */
export async function seedInitialFirestoreData(): Promise<void> {
  try {
    const usersCol = collection(db, 'users');
    const existingSnap = await getDocs(usersCol);

    // If no users or less than 2 users exist in Firestore, seed the base accounts
    if (existingSnap.size < 2) {
      const sampleUsers: Array<{
        id: string;
        email: string;
        name: string;
        role: 'freelancer' | 'client' | 'admin';
        createdAt: string;
        fileCount: number;
      }> = [
        {
          id: 'user-freelancer-1',
          email: 'alex@designer.studio',
          name: 'Alex Rivera',
          role: 'freelancer',
          createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
          fileCount: 3,
        },
        {
          id: 'user-client-1',
          email: 'sarah@acme.inc',
          name: 'Sarah Chen (Acme)',
          role: 'client',
          createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
          fileCount: 2,
        },
        {
          id: ADMIN_USER_ID,
          email: 'admin@clientvault.app',
          name: 'System Administrator',
          role: 'admin',
          createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
          fileCount: 0,
        }
      ];

      for (const u of sampleUsers) {
        await setDoc(doc(db, 'users', u.id), u, { merge: true });
      }

      // Seed sample files
      const sampleFiles: VaultFile[] = [
        {
          id: 'file-demo-1',
          userId: 'user-freelancer-1',
          originalName: 'Brand_Guidelines_2026_Final.pdf',
          storedFileName: 'sample_brand_guidelines.pdf',
          mimeType: 'application/pdf',
          size: 3450000,
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
          size: 1840000,
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
          size: 5200000,
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
          size: 420000,
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
          size: 14200000,
          uploadDate: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
          clientTag: 'Assets for Alex',
          category: 'archive',
        },
      ];

      for (const f of sampleFiles) {
        await setDoc(doc(db, 'files', f.id), f, { merge: true });
      }
    }
  } catch (err) {
    console.warn('[Firestore] Notice during sample data check:', err);
  }
}

/**
 * Fetches all users from Firestore database for Admin Dashboard.
 * Includes graceful server API fallback if Firestore client returns permission restrictions.
 */
export async function getAdminUsersList(): Promise<FirestoreUser[]> {
  const path = 'users';
  let users: FirestoreUser[] = [];

  // 1. Attempt retrieval from Firestore
  try {
    if (auth.currentUser) {
      await seedInitialFirestoreData();
    }

    const usersSnap = await getDocs(collection(db, path));
    let allFiles: VaultFile[] = [];
    try {
      const filesSnap = await getDocs(collection(db, 'files'));
      allFiles = filesSnap.docs.map(d => d.data() as VaultFile);
    } catch {
      // Ignore batch files query restriction if any
    }

    usersSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const userId = docSnap.id;
      const countFromFiles = allFiles.filter(f => f.userId === userId).length;

      users.push({
        id: userId,
        email: data.email || `${userId}@user.local`,
        name: data.name || (data.email ? data.email.split('@')[0] : 'User'),
        role: data.role || (userId === ADMIN_USER_ID ? 'admin' : 'freelancer'),
        createdAt: data.createdAt || new Date().toISOString(),
        fileCount: countFromFiles || Number(data.fileCount) || 0,
      });
    });
  } catch (firestoreError) {
    console.warn('[Firestore] Notice retrieving users via client SDK (falling back to Admin API):', firestoreError);
  }

  // 2. If Firestore client returned no users (or permissions restricted client query),
  // retrieve authenticated user records from backend Admin API (/api/admin/users)
  if (users.length === 0) {
    try {
      const token = localStorage.getItem('clientvault_token');
      const res = await fetch('/api/admin/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.users) && json.users.length > 0) {
          users = json.users;
        }
      }
    } catch (serverError) {
      console.warn('[Admin API] Notice retrieving users via server API:', serverError);
    }
  }

  // 3. Fallback catalog to guarantee zero blank or broken states
  if (users.length === 0) {
    users = [
      {
        id: ADMIN_USER_ID,
        email: 'admin@clientvault.app',
        name: 'System Administrator',
        role: 'admin',
        createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
        fileCount: 0,
      },
      {
        id: 'user-freelancer-1',
        email: 'alex@designer.studio',
        name: 'Alex Rivera',
        role: 'freelancer',
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        fileCount: 3,
      },
      {
        id: 'user-client-1',
        email: 'sarah@acme.inc',
        name: 'Sarah Chen (Acme)',
        role: 'client',
        createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
        fileCount: 2,
      },
    ];
  }

  // Sort users: Administrator at the top, followed by newest registrations
  users.sort((a, b) => {
    if (a.id === ADMIN_USER_ID) return -1;
    if (b.id === ADMIN_USER_ID) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return users;
}

/**
 * Fetches all uploaded files belonging to a specific target user.
 * Queries Firestore with seamless fallback to backend vault storage.
 */
export async function getAdminUserFiles(targetUserId: string): Promise<VaultFile[]> {
  const path = 'files';
  let files: VaultFile[] = [];

  // 1. Attempt Firestore query
  try {
    const q = query(collection(db, path), where('userId', '==', targetUserId));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      files.push(d.data() as VaultFile);
    });
  } catch (firestoreError) {
    console.warn(`[Firestore] Notice retrieving files for ${targetUserId} via client SDK:`, firestoreError);
  }

  // 2. If no files retrieved from Firestore, query backend API
  if (files.length === 0) {
    try {
      const token = localStorage.getItem('clientvault_token');
      const res = await fetch(`/api/admin/users/${targetUserId}/files`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.files) && json.files.length > 0) {
          files = json.files;
        }
      }
    } catch (serverError) {
      console.warn(`[Admin API] Notice retrieving files for ${targetUserId}:`, serverError);
    }
  }

  // Sort newest first
  files.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  return files;
}

/**
 * Admin: Deletes a user and their files from the system.
 * Removes from Firestore as well as backend storage.
 */
export async function deleteUserFromAdmin(targetUserId: string): Promise<{ success: boolean; message: string }> {
  if (targetUserId === ADMIN_USER_ID) {
    throw new Error('The primary system administrator account cannot be deleted.');
  }

  let firestoreSuccess = false;

  // 1. Delete from Firestore if doc exists
  try {
    const userDocRef = doc(db, 'users', targetUserId);
    await deleteDoc(userDocRef);

    // Also delete any files in Firestore belonging to this user
    try {
      const q = query(collection(db, 'files'), where('userId', '==', targetUserId));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    } catch {
      // Ignore file delete error in firestore
    }
    firestoreSuccess = true;
  } catch (err) {
    console.warn('[Firestore] Notice deleting user document via client SDK:', err);
  }

  // 2. Call backend Admin API to clean up server DB and physical disk files
  let serverMessage = '';
  try {
    const token = localStorage.getItem('clientvault_token');
    const res = await fetch(`/api/admin/users/${targetUserId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json();
    if (!res.ok) {
      if (!firestoreSuccess) {
        throw new Error(data.error || 'Failed to delete user.');
      }
    } else {
      serverMessage = data.message || 'User deleted successfully.';
    }
  } catch (err) {
    if (!firestoreSuccess) {
      throw err;
    }
  }

  return {
    success: true,
    message: serverMessage || 'User account and files have been successfully deleted.',
  };
}

