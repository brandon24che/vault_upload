import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  FileText, 
  HardDrive, 
  Calendar, 
  Search, 
  Download, 
  Eye, 
  RefreshCw, 
  LogOut, 
  Folder, 
  Image as ImageIcon, 
  FileArchive, 
  FileCode, 
  ChevronRight,
  ArrowLeft,
  Mail,
  UserCheck,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { User, VaultFile, FirestoreUser } from '../types.ts';
import { getAdminUsersList, getAdminUserFiles, deleteUserFromAdmin, ADMIN_USER_ID } from '../lib/firestoreService.ts';
import { downloadFile } from '../lib/api.ts';
import { FilePreviewModal } from './FilePreviewModal.tsx';
import { ToastContainer, ToastMessage } from './Toast.tsx';

interface AdminDashboardProps {
  currentUser: User;
  onSignOut: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onSignOut,
}) => {
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<FirestoreUser | null>(null);
  const [userFiles, setUserFiles] = useState<VaultFile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userToDelete, setUserToDelete] = useState<FirestoreUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getCleanErrorMessage = (err: unknown, fallback: string): string => {
    if (err instanceof Error) {
      try {
        const parsed = JSON.parse(err.message);
        if (parsed && typeof parsed.error === 'string') {
          return parsed.error;
        }
      } catch {
        return err.message;
      }
      return err.message;
    }
    return fallback;
  };

  // Load all users from Firestore
  const loadUsers = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const list = await getAdminUsersList();
      setUsers(list);
      if (showToast) {
        addToast('success', `Synchronized ${list.length} user directory accounts.`);
      }
      // If a user was previously selected, update the reference
      if (selectedUser) {
        const updated = list.find((u) => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    } catch (err: unknown) {
      const msg = getCleanErrorMessage(err, 'Failed to retrieve users directory');
      addToast('error', msg);
    } finally {
      setIsLoadingUsers(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // When a user is selected, load their files
  const handleSelectUser = async (user: FirestoreUser) => {
    setSelectedUser(user);
    setIsLoadingFiles(true);
    try {
      const files = await getAdminUserFiles(user.id);
      setUserFiles(files);
    } catch (err: unknown) {
      const msg = getCleanErrorMessage(err, 'Could not fetch user files');
      addToast('error', msg);
      setUserFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleDownload = async (file: VaultFile) => {
    try {
      addToast('info', `Downloading "${file.originalName}"...`);
      await downloadFile(file.id, file.originalName);
      addToast('success', 'Download finished.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed.';
      addToast('error', msg);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const res = await deleteUserFromAdmin(userToDelete.id);
      addToast('success', res.message || `User ${userToDelete.email} has been deleted.`);
      
      // If we were currently inspecting this user, return to all users view
      if (selectedUser?.id === userToDelete.id) {
        setSelectedUser(null);
        setUserFiles([]);
      }
      
      setUserToDelete(null);
      // Refresh list
      await loadUsers();
    } catch (err: unknown) {
      const msg = getCleanErrorMessage(err, 'Failed to delete user.');
      addToast('error', msg);
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Format file size helper
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format date helper
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Filter users by search term
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
  });

  // Calculate totals
  const totalUsersCount = users.length;
  const totalFilesCount = users.reduce((sum, u) => sum + (u.fileCount || 0), 0);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-emerald-600" />;
      case 'archive':
        return <FileArchive className="w-4 h-4 text-amber-600" />;
      case 'design':
        return <FileCode className="w-4 h-4 text-purple-600" />;
      default:
        return <FileText className="w-4 h-4 text-sky-600" />;
    }
  };

  return (
    <div id="admin-dashboard-container" className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside 
        id="admin-sidebar" 
        className="w-full md:w-72 bg-[#0F172A] text-slate-200 flex flex-col justify-between shrink-0 border-r border-slate-800"
      >
        <div>
          {/* Brand & Admin Indicator */}
          <div className="p-6 border-b border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
                  <Folder className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">ClientVault</span>
              </div>
            </div>

            {/* Prominent Admin Badge */}
            <div 
              id="admin-badge-indicator" 
              className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Admin View</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-auto" />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Privileged read access to all Firestore database records
            </p>
          </div>

          {/* Nav Links / Overview */}
          <div className="p-4 space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Management
            </div>
            <button
              id="admin-nav-users-btn"
              onClick={() => setSelectedUser(null)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                !selectedUser 
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' 
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>All Users Directory</span>
              </div>
              <span className="px-2 py-0.5 text-xs bg-slate-800 rounded-full text-slate-300 font-mono">
                {totalUsersCount}
              </span>
            </button>

            {selectedUser && (
              <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/60">
                <div className="text-xs text-slate-400 font-medium mb-1">Active User Inspect</div>
                <div className="text-sm font-semibold text-white truncate">{selectedUser.email}</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>{userFiles.length} file{userFiles.length === 1 ? '' : 's'} loaded</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Admin Footer & Sign Out */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-500/30">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {currentUser.email}
              </div>
              <div className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                <Shield className="w-3 h-3" />
                UID: {currentUser.id.substring(0, 10)}...
              </div>
            </div>
          </div>

          <button
            id="admin-sign-out-btn"
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Canvas */}
      <main id="admin-main-content" className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {selectedUser && (
              <button
                id="admin-back-to-users-btn"
                onClick={() => setSelectedUser(null)}
                className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Back to all users"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  {selectedUser ? `User Vault: ${selectedUser.email}` : 'Admin Dashboard'}
                </h1>
                {/* Admin Status Pill */}
                <span 
                  id="admin-status-pill" 
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300"
                >
                  <Shield className="w-3 h-3 text-amber-600" />
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedUser
                  ? `Browsing all uploaded files for account ID: ${selectedUser.id}`
                  : 'Managing users and viewing encrypted file storage across Firestore'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              id="admin-refresh-btn"
              onClick={() => loadUsers(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div id="admin-stat-users" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Registered Users</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalUsersCount}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">From Firestore database</p>
              </div>
            </div>

            <div id="admin-stat-files" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Files Tracked</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalFilesCount}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Across all client vaults</p>
              </div>
            </div>

            <div id="admin-stat-role" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Admin Status</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">Elevated Read Access</p>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  UID Authenticated
                </p>
              </div>
            </div>
          </div>

          {/* Main Display: either Users List or User Files View */}
          {!selectedUser ? (
            /* USERS DIRECTORY VIEW */
            <div id="admin-users-section" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Firestore Users Directory</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click on any user row to inspect their uploaded files
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-search-users-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by email, name, or UID..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-900"
                  />
                </div>
              </div>

              {/* Users Table */}
              {isLoadingUsers ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-500">
                  <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-medium">Fetching users from Firestore...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No users found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table id="admin-users-table" className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-6">User Email</th>
                        <th className="py-3 px-6">Account Created</th>
                        <th className="py-3 px-6 text-center">Uploaded Files</th>
                        <th className="py-3 px-6">Role</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredUsers.map((u) => {
                        const isThisAdmin = u.id === ADMIN_USER_ID;
                        return (
                          <tr
                            key={u.id}
                            id={`user-row-${u.id}`}
                            onClick={() => handleSelectUser(u)}
                            className="hover:bg-sky-50/50 cursor-pointer transition-colors group"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isThisAdmin 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  {u.email.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    <span className="truncate">{u.email}</span>
                                    {isThisAdmin && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                        ADMIN
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono truncate">
                                    UID: {u.id}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-6 text-xs text-slate-600 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{formatDate(u.createdAt)}</span>
                              </div>
                            </td>

                            <td className="py-4 px-6 text-center whitespace-nowrap">
                              <span 
                                id={`file-count-badge-${u.id}`}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  (u.fileCount || 0) > 0 
                                    ? 'bg-sky-100 text-sky-800' 
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <FileText className="w-3 h-3" />
                                {u.fileCount || 0} file{(u.fileCount || 0) === 1 ? '' : 's'}
                              </span>
                            </td>

                            <td className="py-4 px-6 whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium capitalize ${
                                isThisAdmin
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : u.role === 'client'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {u.role || 'user'}
                              </span>
                            </td>

                            <td className="py-4 px-6 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  id={`view-files-btn-${u.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectUser(u);
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-800 px-2.5 py-1.5 rounded-lg hover:bg-sky-50 transition-colors"
                                >
                                  <span>View Files</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                                {!isThisAdmin && (
                                  <button
                                    id={`delete-user-btn-${u.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setUserToDelete(u);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title={`Delete user ${u.email}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* USER'S UPLOADED FILES DETAIL VIEW */
            <div id="admin-user-files-section" className="space-y-4">
              {/* Selected User Banner */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                    {selectedUser.email.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>{selectedUser.email}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                        {selectedUser.role}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Member since {formatDate(selectedUser.createdAt)} • UID: <span className="font-mono text-slate-600">{selectedUser.id}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {selectedUser.id !== ADMIN_USER_ID && (
                    <button
                      id="admin-delete-active-user-btn"
                      onClick={() => setUserToDelete(selectedUser)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete User</span>
                    </button>
                  )}
                  <button
                    id="admin-return-users-list-btn"
                    onClick={() => setSelectedUser(null)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to All Users</span>
                  </button>
                </div>
              </div>

              {/* Files Table / Empty state */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Uploaded Files ({userFiles.length})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      All documents, designs, and media stored by this client
                    </p>
                  </div>
                </div>

                {isLoadingFiles ? (
                  <div className="p-12 flex flex-col items-center justify-center text-slate-500">
                    <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-xs font-medium">Loading uploaded files from database...</p>
                  </div>
                ) : userFiles.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No uploaded files</p>
                    <p className="text-xs text-slate-400 mt-1">
                      This user has not uploaded any files to their vault yet.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table id="admin-user-files-table" className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-6">File Name</th>
                          <th className="py-3 px-6">Category</th>
                          <th className="py-3 px-6">Size</th>
                          <th className="py-3 px-6">Upload Date</th>
                          <th className="py-3 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {userFiles.map((file) => (
                          <tr key={file.id} id={`admin-file-row-${file.id}`} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-slate-100 shrink-0">
                                  {getCategoryIcon(file.category)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                                    {file.originalName}
                                  </p>
                                  {file.clientTag && (
                                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                      {file.clientTag}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-6 whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded text-xs font-medium capitalize bg-slate-100 text-slate-700">
                                {file.category}
                              </span>
                            </td>

                            <td className="py-4 px-6 text-xs text-slate-600 font-mono whitespace-nowrap">
                              {formatSize(file.size)}
                            </td>

                            <td className="py-4 px-6 text-xs text-slate-600 whitespace-nowrap">
                              {formatDate(file.uploadDate)}
                            </td>

                            <td className="py-4 px-6 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  id={`admin-preview-file-${file.id}`}
                                  onClick={() => setPreviewFile(file)}
                                  className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors"
                                  title="Preview File"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  id={`admin-download-file-${file.id}`}
                                  onClick={() => handleDownload(file)}
                                  className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                  title="Download File"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div 
          id="delete-user-modal-overlay"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !isDeletingUser && setUserToDelete(null)}
        >
          <div 
            id="delete-user-modal"
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Delete User Account?
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Are you sure you want to delete <strong className="text-slate-900">{userToDelete.email}</strong>? 
                  This will permanently delete the user's directory entry, access permissions, and all associated vault files.
                </p>
                
                <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="text-slate-500">
                    <span className="font-medium text-slate-700">User ID:</span> <span className="font-mono text-[11px]">{userToDelete.id}</span>
                  </div>
                  <div className="text-slate-500">
                    <span className="font-medium text-slate-700">Role:</span> <span className="capitalize">{userToDelete.role}</span>
                  </div>
                  <div className="text-slate-500">
                    <span className="font-medium text-slate-700">Files to purge:</span> <span>{userToDelete.fileCount || 0} file(s)</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    id="cancel-delete-user-btn"
                    disabled={isDeletingUser}
                    onClick={() => setUserToDelete(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="confirm-delete-user-btn"
                    disabled={isDeletingUser}
                    onClick={handleConfirmDeleteUser}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingUser ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm Deletion</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
