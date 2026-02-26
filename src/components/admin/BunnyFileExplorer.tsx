import { useState, useEffect, useRef, useCallback } from "react";
import {
  Folder, FileText, FileImage, FileVideo, FileAudio, FileArchive, FileCode,
  ArrowLeft, Upload, FolderPlus, Trash2, Loader2, RefreshCw, Copy,
  ExternalLink, ChevronRight, Home, LayoutGrid, LayoutList, Search,
  Eye, MoreVertical, HardDrive, File, Clock, Star, Cloud, ImageIcon,
  Film, Music, Archive, FolderOpen, Plus, X, CheckSquare, Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { bunnyApi, type BunnyFile } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit",
  });
}

function getFileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

type FileCategory = "all" | "images" | "videos" | "audio" | "documents" | "archives" | "folders";

function getFileCategory(file: BunnyFile): FileCategory {
  if (file.is_directory) return "folders";
  const ext = getFileExtension(file.name);
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"].includes(ext)) return "images";
  if (["mp4", "webm", "avi", "mov", "mkv", "flv"].includes(ext)) return "videos";
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) return "audio";
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "dmg", "iso"].includes(ext)) return "archives";
  return "documents";
}

function getFileIcon(file: BunnyFile) {
  if (file.is_directory) return Folder;
  const ext = getFileExtension(file.name);
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"].includes(ext)) return FileImage;
  if (["mp4", "webm", "avi", "mov", "mkv", "flv"].includes(ext)) return FileVideo;
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) return FileAudio;
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "dmg", "iso"].includes(ext)) return FileArchive;
  if (["js", "ts", "jsx", "tsx", "html", "css", "json", "xml", "py", "php", "rb", "go", "rs", "swift", "java", "c", "cpp", "h", "sh", "yml", "yaml", "toml", "md"].includes(ext)) return FileCode;
  if (["txt", "doc", "docx", "pdf", "rtf", "odt", "xls", "xlsx", "csv", "ppt", "pptx"].includes(ext)) return FileText;
  return File;
}

function getIconBg(file: BunnyFile): string {
  if (file.is_directory) return "bg-primary/10 text-primary";
  const ext = getFileExtension(file.name);
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"].includes(ext)) return "bg-pink-500/10 text-pink-500";
  if (["mp4", "webm", "avi", "mov", "mkv", "flv"].includes(ext)) return "bg-purple-500/10 text-purple-500";
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) return "bg-amber-500/10 text-amber-500";
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "dmg", "iso"].includes(ext)) return "bg-orange-500/10 text-orange-500";
  if (["js", "ts", "jsx", "tsx", "html", "css", "json", "xml", "py", "php"].includes(ext)) return "bg-emerald-500/10 text-emerald-500";
  return "bg-muted text-muted-foreground";
}

function isImageFile(name: string): boolean {
  const ext = getFileExtension(name);
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"].includes(ext);
}

// ─── Sidebar Categories ───────────────────────────────────────────────────────

const categories: { id: FileCategory; label: string; icon: typeof Folder }[] = [
  { id: "all", label: "All Files", icon: FolderOpen },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "videos", label: "Videos", icon: Film },
  { id: "audio", label: "Audio", icon: Music },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "archives", label: "Archives", icon: Archive },
  { id: "folders", label: "Folders", icon: Folder },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const BunnyFileExplorer = () => {
  const [files, setFiles] = useState<BunnyFile[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadCompleted, setUploadCompleted] = useState(0);
  const [uploadCurrentName, setUploadCurrentName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BunnyFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<BunnyFile | null>(null);
  const [activeCategory, setActiveCategory] = useState<FileCategory>("all");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [uploadFileStatuses, setUploadFileStatuses] = useState<Record<number, 'pending' | 'uploading' | 'done' | 'cancelled' | 'error'>>({});
  const [uploadFileProgress, setUploadFileProgress] = useState<Record<number, number>>({});
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const uploadAbortControllers = useRef<Record<number, AbortController>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  const loadFiles = async (path: string) => {
    setLoading(true);
    setSelectedFiles(new Set());
    try {
      const result = await bunnyApi.listFiles(path);
      const sorted = result.files.sort((a: BunnyFile, b: BunnyFile) => {
        if (a.is_directory !== b.is_directory) return a.is_directory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setFiles(sorted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    setSearchQuery("");
    setActiveCategory("all");
    setCurrentPath(path);
  };

  const goUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const breadcrumbs = currentPath ? currentPath.split("/").filter(Boolean) : [];

  // Filter by category then search
  const categoryFiltered = activeCategory === "all"
    ? files
    : files.filter(f => getFileCategory(f) === activeCategory);

  const filteredFiles = searchQuery
    ? categoryFiltered.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : categoryFiltered;

  // Stats
  const totalFiles = files.filter(f => !f.is_directory).length;
  const totalFolders = files.filter(f => f.is_directory).length;
  const totalSize = files.reduce((sum, f) => sum + (f.is_directory ? 0 : f.size), 0);

  // Category counts
  const categoryCounts = categories.map(cat => ({
    ...cat,
    count: cat.id === "all" ? files.length : files.filter(f => getFileCategory(f) === cat.id).length,
  }));

  // Recent files (last 4 non-directory files by date)
  const recentFiles = [...files]
    .filter(f => !f.is_directory && f.last_changed)
    .sort((a, b) => new Date(b.last_changed!).getTime() - new Date(a.last_changed!).getTime())
    .slice(0, 4);

  // Selection
  const toggleSelect = (path: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.path)));
    }
  };

  // ─── Upload ───────────────────────────────────────────────────────────────

  const processUpload = useCallback(async (fileList: FileList | File[]) => {
    const filesToUpload = Array.from(fileList);
    if (filesToUpload.length === 0) return;
    setUploading(true);
    setUploadingFiles(filesToUpload);
    setUploadProgress(0);
    setUploadTotal(filesToUpload.length);
    setUploadCompleted(0);
    setUploadCurrentName(filesToUpload[0].name);

    // Init statuses
    const initStatuses: Record<number, 'pending' | 'uploading' | 'done' | 'cancelled' | 'error'> = {};
    const initProgress: Record<number, number> = {};
    filesToUpload.forEach((_, i) => { initStatuses[i] = 'pending'; initProgress[i] = 0; });
    setUploadFileStatuses(initStatuses);
    setUploadFileProgress(initProgress);
    uploadAbortControllers.current = {};

    let completed = 0;
    let cancelled = 0;
    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        // Check if cancelled before starting
        if (uploadAbortControllers.current[i]?.signal?.aborted) {
          cancelled++;
          continue;
        }
        
        const controller = new AbortController();
        uploadAbortControllers.current[i] = controller;

        setUploadFileStatuses(prev => ({ ...prev, [i]: 'uploading' }));
        setUploadCurrentName(file.name);

        try {
          await bunnyApi.uploadFile(file, currentPath, (percent) => {
            setUploadFileProgress(prev => ({ ...prev, [i]: percent }));
            const overallPercent = Math.round(((completed + percent / 100) / filesToUpload.length) * 100);
            setUploadProgress(overallPercent);
          });
          completed++;
          setUploadFileStatuses(prev => ({ ...prev, [i]: 'done' }));
          setUploadFileProgress(prev => ({ ...prev, [i]: 100 }));
          setUploadCompleted(completed);
          setUploadProgress(Math.round((completed / filesToUpload.length) * 100));
        } catch (err) {
          if (uploadAbortControllers.current[i]?.signal?.aborted) {
            cancelled++;
            setUploadFileStatuses(prev => ({ ...prev, [i]: 'cancelled' }));
          } else {
            setUploadFileStatuses(prev => ({ ...prev, [i]: 'error' }));
            throw err;
          }
        }
      }
      const uploaded = completed;
      if (uploaded > 0) {
        toast.success(`${uploaded} file${uploaded !== 1 ? "s" : ""} uploaded${cancelled > 0 ? `, ${cancelled} cancelled` : ""}`);
      } else if (cancelled > 0) {
        toast.info(`Upload cancelled`);
      }
      loadFiles(currentPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadTotal(0);
      setUploadCompleted(0);
      setUploadCurrentName("");
      setUploadingFiles([]);
      setUploadFileStatuses({});
      setUploadFileProgress({});
      uploadAbortControllers.current = {};
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [currentPath]);

  const cancelFileUpload = (index: number) => {
    if (uploadAbortControllers.current[index]) {
      uploadAbortControllers.current[index].abort();
    }
    setUploadFileStatuses(prev => ({ ...prev, [index]: 'cancelled' }));
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPendingFiles(Array.from(e.target.files));
      setShowUploadConfirm(true);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const confirmUpload = () => {
    if (pendingFiles.length === 0) return;
    setShowUploadConfirm(false);
    processUpload(pendingFiles);
    setPendingFiles([]);
  };

  const cancelUpload = () => {
    setShowUploadConfirm(false);
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      setPendingFiles(Array.from(e.dataTransfer.files));
      setShowUploadConfirm(true);
    }
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await bunnyApi.deleteFile(deleteTarget.path, deleteTarget.is_directory);
      toast.success(`Deleted "${deleteTarget.name}"`);
      setDeleteTarget(null);
      loadFiles(currentPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally { setDeleting(false); }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const folderPath = currentPath ? `${currentPath}/${newFolderName.trim()}` : newFolderName.trim();
      await bunnyApi.createFolder(folderPath);
      toast.success("Folder created");
      setShowNewFolder(false);
      setNewFolderName("");
      loadFiles(currentPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    } finally { setCreatingFolder(false); }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("CDN URL copied");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      ref={dropRef}
      className="relative flex gap-0 h-full min-h-[650px]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary rounded-2xl backdrop-blur-sm">
          <div className="text-center">
            <Upload className="w-14 h-14 text-primary mx-auto mb-3 animate-bounce" />
            <p className="text-lg font-bold text-primary">Drop files to upload</p>
            <p className="text-sm text-muted-foreground mt-1">to /{currentPath || "root"}</p>
          </div>
        </div>
      )}

      {/* ─── Left Sidebar ──────────────────────────────────────────────── */}
      <div className="w-56 shrink-0 border-r border-border bg-muted/20 rounded-l-2xl p-4 space-y-6 hidden lg:flex flex-col">
        {/* Storage info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Cloud className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">CDN Storage</p>
              <p className="text-[11px] text-muted-foreground">{totalFiles} files · {formatBytes(totalSize)}</p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Categories</p>
          {categoryCounts.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <cat.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{cat.label}</span>
              <span className={cn(
                "text-[11px] tabular-nums",
                activeCategory === cat.id ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Main Content ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateTo("")}>
              <Home className="w-4 h-4" />
            </Button>
            {currentPath && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goUp}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-x-auto">
            <span
              className="font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0"
              onClick={() => navigateTo("")}
            >
              Storage
            </span>
            {breadcrumbs.map((part, i) => (
              <span key={i} className="flex items-center gap-1 shrink-0">
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                <span
                  className={cn(
                    "font-medium cursor-pointer transition-colors",
                    i === breadcrumbs.length - 1 ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => navigateTo(breadcrumbs.slice(0, i + 1).join("/"))}
                >
                  {part}
                </span>
              </span>
            ))}
          </div>

          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="h-9 w-52 pl-9 text-sm rounded-lg bg-muted/40 border-transparent focus:border-border"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* View toggles */}
          <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadFiles(currentPath)} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>

          <div className="h-5 w-px bg-border hidden sm:block" />

          <Button variant="outline" size="sm" className="h-8 gap-1.5 hidden sm:flex" onClick={() => setShowNewFolder(true)}>
            <FolderPlus className="w-3.5 h-3.5" /> New Folder
          </Button>
          <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
          <Button
            size="sm"
            className="h-8 gap-1.5 hidden sm:flex bg-emerald-500 hover:bg-emerald-600 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload
          </Button>

          {/* Mobile buttons */}
          <div className="flex sm:hidden items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setShowNewFolder(true)}>
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="h-1 bg-muted/50">
            <div className="h-full bg-primary rounded-r-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}

        {/* Recent Files (only on root) */}
        {!currentPath && recentFiles.length > 0 && activeCategory === "all" && !searchQuery && (
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Recent Files</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recentFiles.map(file => {
                const IconComp = getFileIcon(file);
                const bgClass = getIconBg(file);
                return (
                  <div
                    key={file.path}
                    className="group relative bg-card border border-border rounded-xl p-3 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => isImageFile(file.name) ? setPreviewFile(file) : file.cdn_url && window.open(file.cdn_url, '_blank')}
                  >
                    {/* Thumbnail */}
                    <div className="w-full aspect-[4/3] rounded-lg overflow-hidden mb-2.5 bg-muted/30 flex items-center justify-center">
                      {isImageFile(file.name) && file.cdn_url ? (
                        <img src={file.cdn_url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", bgClass)}>
                          <IconComp className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatBytes(file.size)} · {formatDate(file.last_changed)}</p>
                    {/* Quick actions on hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="secondary" size="icon" className="h-6 w-6 shadow-sm backdrop-blur-sm">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {file.cdn_url && (
                            <>
                              <DropdownMenuItem onClick={() => copyUrl(file.cdn_url!)}><Copy className="w-3.5 h-3.5 mr-2" /> Copy URL</DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={file.cdn_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-2" /> Open</a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(file)}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">
              {activeCategory === "all" ? "All Files" : categories.find(c => c.id === activeCategory)?.label}
            </h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full tabular-nums">
              {filteredFiles.length}
            </span>
            {selectedFiles.size > 0 && (
              <span className="text-xs text-primary font-medium">
                {selectedFiles.size} selected
              </span>
            )}
          </div>
          {selectedFiles.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => {
                const file = files.find(f => selectedFiles.has(f.path));
                if (file) setDeleteTarget(file);
              }}
            >
              <Trash2 className="w-3 h-3" /> Delete
            </Button>
          )}
        </div>

        {/* File content */}
        <div className="flex-1 overflow-auto px-5 pb-4">
          {loading && files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Loading files...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              {searchQuery ? (
                <>
                  <Search className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No results for "{searchQuery}"</p>
                  <Button variant="link" size="sm" onClick={() => setSearchQuery("")}>Clear search</Button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <Folder className="w-10 h-10 opacity-30" />
                  </div>
                  <p className="text-sm font-medium">This folder is empty</p>
                  <p className="text-xs mt-1 mb-4">Drag & drop files or click upload to get started</p>
                  <Button size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4" /> Upload Files
                  </Button>
                </>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* ─── Grid View ─────────────────────────────────────────── */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredFiles.map(file => {
                const IconComp = getFileIcon(file);
                const bgClass = getIconBg(file);
                const isSelected = selectedFiles.has(file.path);
                return (
                  <div
                    key={file.path}
                    className={cn(
                      "group relative flex flex-col rounded-xl border transition-all overflow-hidden",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/20 hover:shadow-md",
                      file.is_directory && "cursor-pointer"
                    )}
                    onClick={() => file.is_directory ? navigateTo(file.path) : toggleSelect(file.path)}
                  >
                    {/* Thumbnail area */}
                    <div className="w-full aspect-square flex items-center justify-center bg-muted/20 relative">
                      {!file.is_directory && isImageFile(file.name) && file.cdn_url ? (
                        <img src={file.cdn_url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", bgClass)}>
                          <IconComp className="w-7 h-7" />
                        </div>
                      )}

                      {/* Selection checkbox */}
                      {!file.is_directory && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelect(file.path); }}
                          className={cn(
                            "absolute top-2 left-2 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100"
                          )}
                        >
                          {isSelected && <CheckSquare className="w-3 h-3" />}
                        </button>
                      )}

                      {/* Quick action */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="secondary" size="icon" className="h-6 w-6 shadow-sm backdrop-blur-sm bg-background/80">
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {file.cdn_url && (
                              <>
                                <DropdownMenuItem onClick={() => copyUrl(file.cdn_url!)}><Copy className="w-3.5 h-3.5 mr-2" /> Copy CDN URL</DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={file.cdn_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-2" /> Open</a>
                                </DropdownMenuItem>
                                {isImageFile(file.name) && (
                                  <DropdownMenuItem onClick={() => setPreviewFile(file)}><Eye className="w-3.5 h-3.5 mr-2" /> Preview</DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(file)}>
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-3 py-2.5">
                      <p className="text-xs font-medium truncate" title={file.name}>{file.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {file.is_directory ? "Folder" : `${formatBytes(file.size)} · ${formatDate(file.last_changed)}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ─── List View ─────────────────────────────────────────── */
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              {/* Table header */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <button className="w-5 h-5 shrink-0 flex items-center justify-center" onClick={selectAll}>
                  {selectedFiles.size === filteredFiles.length && filteredFiles.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
                <div className="flex-1">Name</div>
                <div className="w-20 text-right hidden md:block">Size</div>
                <div className="w-28 text-right hidden lg:block">Modified</div>
                <div className="w-20 text-right">Actions</div>
              </div>

              {/* Table rows */}
              <div className="divide-y divide-border">
                {filteredFiles.map(file => {
                  const IconComp = getFileIcon(file);
                  const bgClass = getIconBg(file);
                  const isSelected = selectedFiles.has(file.path);
                  return (
                    <div
                      key={file.path}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 transition-colors group",
                        isSelected ? "bg-primary/5" : "hover:bg-muted/30",
                        file.is_directory && "cursor-pointer"
                      )}
                      onClick={() => file.is_directory ? navigateTo(file.path) : toggleSelect(file.path)}
                    >
                      {/* Checkbox */}
                      <button
                        className="w-5 h-5 shrink-0 flex items-center justify-center"
                        onClick={(e) => { e.stopPropagation(); toggleSelect(file.path); }}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground" />
                        )}
                      </button>

                      {/* Icon */}
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", bgClass)}>
                        {!file.is_directory && isImageFile(file.name) && file.cdn_url ? (
                          <img src={file.cdn_url} alt={file.name} className="w-9 h-9 rounded-lg object-cover" loading="lazy" />
                        ) : (
                          <IconComp className="w-4.5 h-4.5" />
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {file.is_directory ? "Folder" : getFileExtension(file.name).toUpperCase() || "File"}
                        </p>
                      </div>

                      {/* Size */}
                      <span className="text-xs text-muted-foreground w-20 text-right hidden md:block tabular-nums">
                        {file.is_directory ? "—" : formatBytes(file.size)}
                      </span>

                      {/* Date */}
                      <span className="text-xs text-muted-foreground w-28 text-right hidden lg:block">
                        {formatDate(file.last_changed)}
                      </span>

                      {/* Actions */}
                      <div className="w-20 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {file.cdn_url && !file.is_directory && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); copyUrl(file.cdn_url!); }}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {file.cdn_url && (
                              <>
                                <DropdownMenuItem onClick={() => copyUrl(file.cdn_url!)}><Copy className="w-3.5 h-3.5 mr-2" /> Copy URL</DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={file.cdn_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-2" /> Open</a>
                                </DropdownMenuItem>
                                {isImageFile(file.name) && (
                                  <DropdownMenuItem onClick={() => setPreviewFile(file)}><Eye className="w-3.5 h-3.5 mr-2" /> Preview</DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(file)}>
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-5 py-2 border-t border-border text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{totalFolders} folder{totalFolders !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{totalFiles} file{totalFiles !== 1 ? "s" : ""}</span>
          </div>
          <span>{formatBytes(totalSize)}</span>
        </div>
      </div>

      {/* ─── Upload Confirm Dialog ─────────────────────────────────── */}

      <Dialog open={showUploadConfirm} onOpenChange={(open) => { if (!open) cancelUpload(); }}>
        <DialogContent className="sm:max-w-md" aria-describedby="upload-confirm-desc">
          <DialogTitle className="sr-only">Confirm Upload</DialogTitle>
          <p id="upload-confirm-desc" className="sr-only">Select files to upload</p>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Confirm Upload</h3>
                <p className="text-blue-100 text-xs">
                  {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} · {formatBytes(pendingFiles.reduce((s, f) => s + f.size, 0))} total
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground mb-2">Remove files you don't want to upload:</p>
            <ScrollArea className="max-h-[260px]">
              <div className="space-y-1.5 pr-1">
                {pendingFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-lg bg-muted/30 p-2.5 group">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <File className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      onClick={() => removePendingFile(i)}
                      className="w-6 h-6 rounded-md flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {pendingFiles.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No files selected</p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="px-4 pb-4 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={cancelUpload}>Cancel</Button>
            <Button size="sm" onClick={confirmUpload} disabled={pendingFiles.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Dialogs ───────────────────────────────────────────────────── */}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.is_directory ? "Folder" : "File"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              {deleteTarget?.is_directory && " All contents inside will be removed."}
              <br />This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Progress Dialog */}
      <Dialog open={uploading} onOpenChange={(open) => {
        if (!open) {
          // Cancel all remaining uploads
          Object.entries(uploadAbortControllers.current).forEach(([i, ctrl]) => {
            ctrl.abort();
            setUploadFileStatuses(prev => ({ ...prev, [Number(i)]: prev[Number(i)] === 'done' ? 'done' : 'cancelled' }));
          });
        }
      }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden" onPointerDownOutside={e => e.preventDefault()}>
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 px-6 py-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Uploading Files</h3>
                <p className="text-emerald-100 text-xs">/{currentPath || "root"}</p>
              </div>
            </div>
            {/* Overall progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-100">
                  {uploadCompleted} of {uploadTotal} completed
                </span>
                <span className="font-bold tabular-nums">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              {/* Total size info */}
              <div className="flex items-center justify-between text-xs text-emerald-100">
                <span>
                  {formatBytes(uploadingFiles.reduce((sum, f, i) => {
                    const status = uploadFileStatuses[i];
                    const progress = uploadFileProgress[i] || 0;
                    if (status === 'done') return sum + f.size;
                    if (status === 'uploading') return sum + Math.round(f.size * progress / 100);
                    return sum;
                  }, 0))} uploaded
                </span>
                <span>
                  {formatBytes(uploadingFiles.reduce((sum, f) => sum + f.size, 0))} total
                </span>
              </div>
            </div>
          </div>

          {/* File list */}
          <div className="px-4 py-3">
            <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1">
              {uploadingFiles.map((file, i) => {
                const status = uploadFileStatuses[i] || 'pending';
                const progress = uploadFileProgress[i] || 0;
                const uploadedBytes = status === 'done' ? file.size : Math.round(file.size * progress / 100);
                return (
                  <div key={i} className={cn(
                    "rounded-lg p-2.5 transition-all",
                    status === 'uploading' && "bg-emerald-500/5 ring-1 ring-emerald-500/20",
                    status === 'done' && "bg-emerald-500/5",
                    status === 'cancelled' && "bg-muted/50 opacity-60",
                    status === 'error' && "bg-destructive/5 ring-1 ring-destructive/20",
                    status === 'pending' && "bg-muted/30"
                  )}>
                    <div className="flex items-center gap-2.5">
                      {/* Status icon */}
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                        status === 'done' && "bg-emerald-500/10",
                        status === 'uploading' && "bg-emerald-500/10",
                        status === 'cancelled' && "bg-muted",
                        status === 'error' && "bg-destructive/10",
                        status === 'pending' && "bg-muted"
                      )}>
                        {status === 'done' ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                        ) : status === 'uploading' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                        ) : status === 'cancelled' ? (
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : status === 'error' ? (
                          <X className="w-3.5 h-3.5 text-destructive" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-medium truncate",
                          status === 'cancelled' && "line-through text-muted-foreground",
                          status === 'error' && "text-destructive"
                        )}>{file.name}</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {status === 'uploading' && `${formatBytes(uploadedBytes)} / ${formatBytes(file.size)}`}
                          {status === 'done' && formatBytes(file.size)}
                          {status === 'pending' && formatBytes(file.size)}
                          {status === 'cancelled' && 'Cancelled'}
                          {status === 'error' && 'Failed'}
                        </p>
                      </div>
                      {/* Right side: progress or cancel */}
                      {status === 'uploading' && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">{progress}%</span>
                      )}
                      {(status === 'pending' || status === 'uploading') && (
                        <button
                          type="button"
                          onClick={() => cancelFileUpload(i)}
                          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {/* Per-file progress bar */}
                    {status === 'uploading' && (
                      <div className="h-1 bg-emerald-500/10 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>


      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" /> New Folder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Location: <span className="font-medium text-foreground">/{currentPath || "root"}</span>
            </p>
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateFolder()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()}>
              {creatingFolder ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FolderPlus className="w-4 h-4 mr-1.5" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          {previewFile?.cdn_url && (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden bg-muted/20 flex items-center justify-center min-h-[200px]">
                <img src={previewFile.cdn_url} alt={previewFile.name} className="max-w-full max-h-[60vh] object-contain" />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{formatBytes(previewFile.size)}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyUrl(previewFile.cdn_url!)}>
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy URL
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={previewFile.cdn_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
