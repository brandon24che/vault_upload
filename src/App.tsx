import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { AuthPage } from './components/AuthPage.tsx';
import { UploadArea } from './components/UploadArea.tsx';
import { FileList } from './components/FileList.tsx';
import { StorageStatsCard } from './components/StorageStatsCard.tsx';
import { FilePreviewModal } from './components/FilePreviewModal.tsx';
import { DeleteConfirmModal } from './components/DeleteConfirmModal.tsx';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { 
  getCurrentUser, 
  fetchFiles, 
  fetchStorageStats, 
  deleteFile, 
  downloadFile, 
  logout,
  mapFirebaseUser,
  setSession,
  clearSession,
  verifyEmailWithActionCode
} from './lib/api.ts';
import { auth, onAuthStateChanged } from './lib/firebase.ts';
import { User, VaultFile, StorageStats } from './types.ts';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { UpgradeModal } from './components/UpgradeModal.tsx';
import { 
  ADMIN_USER_ID, 
  FREE_PLAN_LIMIT, 
  subscribeUserFilesCount, 
  syncUserFilesSubcollection,
  syncFileToFirestore,
  syncDeleteFileFromFirestore
} from './lib/firestoreService.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  // Free-plan tracking and Upgrade Modal
  const [subcollectionFileCount, setSubcollectionFileCount] = useState<number>(0);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  
  // Modals & interaction state
  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null);
  const [fileToDelete, setFileToDelete] = useState<VaultFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const uploadAreaRef = useRef<HTMLDivElement>(null);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Listen to Firebase Auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email?.toLowerCase() || '';
        const isDemo = email === 'alex@designer.studio' || email === 'sarah@acme.inc';
        const isGoogle = firebaseUser.providerData.some((p) => p.providerId === 'google.com');

        if (!firebaseUser.emailVerified && !isDemo && !isGoogle) {
          // Email not verified - sign out and keep on auth screen
          clearSession();
          setCurrentUser(null);
          setIsAuthChecking(false);
          return;
        }

        try {
          const token = await firebaseUser.getIdToken();
          const user = mapFirebaseUser(firebaseUser);
          setSession(token, user);
          setCurrentUser(user);
        } catch (err) {
          console.error('Session verification error:', err);
          setCurrentUser(null);
        }
      } else {
        clearSession();
        setCurrentUser(null);
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle email verification links or returns (mode=verifyEmail with oobCode)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    const verifiedParam = params.get('verified') || params.get('emailVerified');

    if (mode === 'verifyEmail' && oobCode) {
      verifyEmailWithActionCode(oobCode)
        .then(() => {
          addToast('success', 'Your email address has been successfully verified! You can now sign in.');
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          console.error('Email verification error:', err);
          addToast('error', 'The email verification link has expired or has already been used.');
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    } else if (verifiedParam === 'true') {
      addToast('success', 'Email verification confirmed! Please sign in to access your vault.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Real-time listener for files under users/{uid}/files
  useEffect(() => {
    if (!currentUser || currentUser.id === ADMIN_USER_ID || currentUser.role === 'admin') {
      setSubcollectionFileCount(0);
      return;
    }

    const unsubscribe = subscribeUserFilesCount(currentUser.id, (count) => {
      setSubcollectionFileCount(count);
    });

    return () => unsubscribe();
  }, [currentUser?.id, currentUser?.role]);

  // Fetch files and storage stats when user or category changes
  const loadVaultData = async () => {
    if (!currentUser) return;
    setIsLoadingFiles(true);
    try {
      const [filesList, storageStats] = await Promise.all([
        fetchFiles({ category: activeCategory }),
        fetchStorageStats(),
      ]);
      setFiles(filesList);
      setStats(storageStats);

      // Ensure user's files are synced to users/{uid}/files in Firestore
      if (filesList.length > 0) {
        syncUserFilesSubcollection(currentUser.id, filesList).catch(() => {});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve vault data.';
      addToast('error', msg);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.id !== ADMIN_USER_ID && currentUser.role !== 'admin') {
      loadVaultData();
    }
  }, [currentUser, activeCategory]);

  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setFiles([]);
    setStats(null);
    setSubcollectionFileCount(0);
    addToast('info', 'You have been safely signed out.');
  };

  const handleFileUploaded = (newFile: VaultFile) => {
    setFiles((prev) => [newFile, ...prev]);
    // Sync newly uploaded file to Firestore files and users/{uid}/files
    syncFileToFirestore(newFile).catch(() => {});
    // Refresh stats
    fetchStorageStats().then((s) => setStats(s)).catch(() => {});
  };

  const handleDeleteFile = (file: VaultFile) => {
    setFileToDelete(file);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);

    try {
      await deleteFile(fileToDelete.id);
      if (currentUser) {
        syncDeleteFileFromFirestore(fileToDelete.id, currentUser.id).catch(() => {});
      }
      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      addToast('success', `"${fileToDelete.originalName}" was deleted.`);
      setFileToDelete(null);
      // Refresh stats
      fetchStorageStats().then((s) => setStats(s)).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not delete file.';
      addToast('error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (file: VaultFile) => {
    try {
      addToast('info', `Starting download for "${file.originalName}"...`);
      await downloadFile(file.id, file.originalName);
      addToast('success', 'Download finished.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed.';
      addToast('error', msg);
    }
  };

  const scrollToUpload = () => {
    if (uploadAreaRef.current) {
      uploadAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // highlight drop zone
      const dropZone = document.getElementById('drop-zone');
      if (dropZone) {
        dropZone.classList.add('ring-2', 'ring-sky-500');
        setTimeout(() => {
          dropZone.classList.remove('ring-2', 'ring-sky-500');
        }, 1200);
      }
    }
  };

  const getCategoryTitle = () => {
    switch (activeCategory) {
      case 'document':
        return 'Documents';
      case 'image':
        return 'Images & Graphics';
      case 'design':
        return 'Design Assets';
      case 'archive':
        return 'Archives & Zip Files';
      default:
        return 'All Files';
    }
  };

  // Loading splash while checking session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="animate-spin w-9 h-9 border-3 border-sky-500 border-t-transparent rounded-full mb-3" />
        <p className="text-sm font-semibold text-slate-700">Connecting to ClientVault...</p>
      </div>
    );
  }

  // Not signed in: show auth page
  if (!currentUser) {
    return (
      <>
        <AuthPage
          onSuccess={(user) => {
            setCurrentUser(user);
            setActiveCategory('all');
          }}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  // If the logged-in user is the Admin user (OP8cEaPrWJcWPuT5PSxGD3Efacn1), show Admin Dashboard
  if (currentUser.id === ADMIN_USER_ID || currentUser.role === 'admin') {
    return (
      <AdminDashboard
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />
    );
  }

  // Regular signed-in users: evaluate free-plan limit based on users/{uid}/files
  const isRegularUser = Boolean(currentUser && currentUser.id !== ADMIN_USER_ID && currentUser.role !== 'admin');
  const userFilesCount = Math.max(subcollectionFileCount, files.length);
  const isLimitReached = isRegularUser && userFilesCount >= FREE_PLAN_LIMIT;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Dark Navy Sidebar */}
      <Sidebar
        user={currentUser}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onOpenUpload={scrollToUpload}
        onSignOut={handleSignOut}
        stats={stats}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        isLimitReached={isLimitReached}
        fileCount={userFilesCount}
        maxFiles={FREE_PLAN_LIMIT}
        onOpenUpgrade={() => setIsUpgradeModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          user={currentUser}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          onOpenUpload={scrollToUpload}
          onSignOut={handleSignOut}
          categoryTitle={getCategoryTitle()}
          isLimitReached={isLimitReached}
          onOpenUpgrade={() => setIsUpgradeModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {/* Storage Capacity Bar */}
          <StorageStatsCard
            stats={stats}
            fileCount={userFilesCount}
            maxFiles={FREE_PLAN_LIMIT}
            isLimitReached={isLimitReached}
            onOpenUpgrade={() => setIsUpgradeModalOpen(true)}
          />

          {/* Upload Area */}
          <div ref={uploadAreaRef}>
            <UploadArea
              onFileUploaded={handleFileUploaded}
              onToast={addToast}
              isLimitReached={isLimitReached}
              fileCount={userFilesCount}
              maxFiles={FREE_PLAN_LIMIT}
              onOpenUpgrade={() => setIsUpgradeModalOpen(true)}
            />
          </div>

          {/* Files List View */}
          <FileList
            files={files}
            onDeleteFile={handleDeleteFile}
            onPreviewFile={(file) => setPreviewFile(file)}
            onDownloadFile={handleDownload}
            onOpenUpload={scrollToUpload}
            isLoading={isLoadingFiles}
          />
        </main>
      </div>

      {/* Modals & Feedback */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        fileCount={userFilesCount}
        maxFiles={FREE_PLAN_LIMIT}
      />

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />

      <DeleteConfirmModal
        file={fileToDelete}
        isOpen={!!fileToDelete}
        isDeleting={isDeleting}
        onConfirm={confirmDeleteFile}
        onClose={() => setFileToDelete(null)}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
