import { useState, useMemo } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Palette, 
  Archive, 
  FileQuestion, 
  Download, 
  Trash2, 
  Eye, 
  Search, 
  ArrowUpDown, 
  LayoutGrid, 
  List, 
  Tag, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { VaultFile } from '../types.ts';
import { formatBytes, formatDate, formatRelativeTime } from '../lib/formatters.ts';

interface FileListProps {
  files: VaultFile[];
  onDeleteFile: (file: VaultFile) => void;
  onPreviewFile: (file: VaultFile) => void;
  onDownloadFile: (file: VaultFile) => void;
  onOpenUpload: () => void;
  isLoading: boolean;
}

export function FileList({
  files,
  onDeleteFile,
  onPreviewFile,
  onDownloadFile,
  onOpenUpload,
  isLoading,
}: FileListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'size-desc'>('date-desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const filteredAndSortedFiles = useMemo(() => {
    let list = [...files];

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((f) => f.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.originalName.toLowerCase().includes(q) ||
          (f.clientTag && f.clientTag.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      }
      if (sortBy === 'date-asc') {
        return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
      }
      if (sortBy === 'name-asc') {
        return a.originalName.localeCompare(b.originalName);
      }
      if (sortBy === 'size-desc') {
        return b.size - a.size;
      }
      return 0;
    });

    return list;
  }, [files, selectedCategory, searchQuery, sortBy]);

  const getCategoryIcon = (category: VaultFile['category']) => {
    switch (category) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-emerald-600" />;
      case 'document':
        return <FileText className="w-4 h-4 text-sky-600" />;
      case 'design':
        return <Palette className="w-4 h-4 text-purple-600" />;
      case 'archive':
        return <Archive className="w-4 h-4 text-amber-600" />;
      default:
        return <FileQuestion className="w-4 h-4 text-slate-500" />;
    }
  };

  const getCategoryBadgeClass = (category: VaultFile['category']) => {
    switch (category) {
      case 'image':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'document':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'design':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'archive':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div id="vault-files-container" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Search, Filter & Controls Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            id="file-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files by name or client tag..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 placeholder:text-slate-400"
          />
        </div>

        {/* View mode, Sort, and Category pills */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Category Dropdown/Selector */}
          <select
            id="category-filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="document">Documents</option>
            <option value="image">Images</option>
            <option value="design">Design Assets</option>
            <option value="archive">Archives</option>
          </select>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="sort-by-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-transparent border-0 text-slate-700 font-medium focus:outline-none cursor-pointer py-1"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="size-desc">Size (Largest)</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            <button
              id="view-table-btn"
              onClick={() => setViewMode('table')}
              aria-label="Table View"
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              id="view-grid-btn"
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Grid or Empty State */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500">
          <div className="inline-block animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full mb-3" />
          <p className="text-sm font-medium">Loading your secure vault...</p>
        </div>
      ) : filteredAndSortedFiles.length === 0 ? (
        <div id="empty-vault-state" className="py-16 px-4 text-center max-w-md mx-auto">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">
            {searchQuery || selectedCategory !== 'all' ? 'No matching files found' : 'Your vault is empty'}
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your search terms or filter criteria.'
              : 'Upload your first file to share securely with your clients and team.'}
          </p>
          <button
            onClick={onOpenUpload}
            id="empty-state-upload-btn"
            className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Upload File Now
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">File Name</th>
                <th className="py-3.5 px-4">Tag / Project</th>
                <th className="py-3.5 px-4">Size</th>
                <th className="py-3.5 px-4">Upload Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedFiles.map((file) => (
                <tr
                  key={file.id}
                  id={`file-row-${file.id}`}
                  className="hover:bg-slate-50/60 transition-colors group"
                >
                  {/* File Name + Icon */}
                  <td className="py-3 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
                        {getCategoryIcon(file.category)}
                      </div>
                      <div className="min-w-0 max-w-xs sm:max-w-md">
                        <div
                          onClick={() => onPreviewFile(file)}
                          className="font-medium text-slate-900 truncate hover:text-sky-600 cursor-pointer"
                          title={file.originalName}
                        >
                          {file.originalName}
                        </div>
                        <span
                          className={`inline-block text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded border ${getCategoryBadgeClass(
                            file.category
                          )}`}
                        >
                          {file.category}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Project / Tag */}
                  <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                    {file.clientTag ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                        <Tag className="w-2.5 h-2.5 text-slate-400" />
                        {file.clientTag}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">General</span>
                    )}
                  </td>

                  {/* File Size */}
                  <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap font-medium">
                    {formatBytes(file.size)}
                  </td>

                  {/* Upload Date */}
                  <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                    <div className="font-medium text-slate-800">{formatDate(file.uploadDate)}</div>
                    <div className="text-[11px] text-slate-400">{formatRelativeTime(file.uploadDate)}</div>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onPreviewFile(file)}
                        id={`preview-file-${file.id}`}
                        title="Preview File"
                        aria-label={`Preview ${file.originalName}`}
                        className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDownloadFile(file)}
                        id={`download-file-${file.id}`}
                        title="Download File"
                        aria-label={`Download ${file.originalName}`}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteFile(file)}
                        id={`delete-file-${file.id}`}
                        title="Delete File"
                        aria-label={`Delete ${file.originalName}`}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAndSortedFiles.map((file) => (
            <div
              key={file.id}
              id={`file-card-${file.id}`}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200/70">
                    {getCategoryIcon(file.category)}
                  </div>
                  <span
                    className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${getCategoryBadgeClass(
                      file.category
                    )}`}
                  >
                    {file.category}
                  </span>
                </div>

                <h4
                  onClick={() => onPreviewFile(file)}
                  className="font-semibold text-sm text-slate-900 truncate hover:text-sky-600 cursor-pointer mb-1"
                  title={file.originalName}
                >
                  {file.originalName}
                </h4>

                {file.clientTag && (
                  <div className="inline-flex items-center gap-1 text-[11px] text-slate-500 mb-2 truncate max-w-full">
                    <Tag className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span className="truncate">{file.clientTag}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{formatBytes(file.size)}</span>
                <span>{formatRelativeTime(file.uploadDate)}</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-1">
                <button
                  onClick={() => onPreviewFile(file)}
                  title="Preview"
                  aria-label={`Preview ${file.originalName}`}
                  className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDownloadFile(file)}
                  title="Download"
                  aria-label={`Download ${file.originalName}`}
                  className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteFile(file)}
                  title="Delete"
                  aria-label={`Delete ${file.originalName}`}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
