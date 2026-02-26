import { useState, useEffect } from "react";
import {
  Folder, FileText, FileImage, FileVideo, FileAudio, FileArchive,
  ArrowLeft, Home, ChevronRight, Search, File, Loader2, HardDrive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { bunnyApi, type BunnyFile } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function getFileIcon(file: BunnyFile) {
  if (file.is_directory) return Folder;
  const ext = getFileExtension(file.name);
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext)) return FileImage;
  if (["mp4", "webm", "avi", "mov", "mkv"].includes(ext)) return FileVideo;
  if (["mp3", "wav", "ogg", "flac", "aac"].includes(ext)) return FileAudio;
  if (["zip", "rar", "7z", "tar", "gz", "dmg", "iso"].includes(ext)) return FileArchive;
  return FileText;
}

function getIconColor(file: BunnyFile): string {
  if (file.is_directory) return "text-amber-500";
  const ext = getFileExtension(file.name);
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext)) return "text-emerald-500";
  if (["mp4", "webm", "avi", "mov", "mkv"].includes(ext)) return "text-blue-500";
  if (["mp3", "wav", "ogg", "flac", "aac"].includes(ext)) return "text-purple-500";
  if (["zip", "rar", "7z", "tar", "gz", "dmg", "iso"].includes(ext)) return "text-orange-500";
  return "text-muted-foreground";
}

interface BunnyFilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, fileName: string) => void;
}

export function BunnyFilePicker({ open, onOpenChange, onSelect }: BunnyFilePickerProps) {
  const [files, setFiles] = useState<BunnyFile[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BunnyFile | null>(null);

  const loadFiles = async (path: string) => {
    setLoading(true);
    setSelected(null);
    try {
      const res = await bunnyApi.listFiles(path);
      setFiles(res.files || []);
      setCurrentPath(res.current_path || path);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadFiles("");
      setSearch("");
      setSelected(null);
    }
  }, [open]);

  const navigateTo = (path: string) => {
    loadFiles(path);
  };

  const pathParts = currentPath.split("/").filter(Boolean);

  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  // Sort: folders first, then files
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_directory && !b.is_directory) return -1;
    if (!a.is_directory && b.is_directory) return 1;
    return a.name.localeCompare(b.name);
  });

  const handleSelect = () => {
    if (selected && selected.cdn_url) {
      onSelect(selected.cdn_url, selected.name);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            Browse Storage Files
          </DialogTitle>
        </DialogHeader>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm flex-wrap">
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => navigateTo("")}>
            <Home className="w-3.5 h-3.5" /> Root
          </Button>
          {pathParts.map((part, i) => (
            <div key={i} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <Button
                variant="ghost" size="sm" className="h-7 px-2"
                onClick={() => navigateTo(pathParts.slice(0, i + 1).join("/") + "/")}
              >
                {part}
              </Button>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search files..." className="pl-9 h-9"
          />
        </div>

        {/* File list */}
        <ScrollArea className="flex-1 min-h-[300px] max-h-[400px] border rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <File className="w-8 h-8 mb-2" />
              <p className="text-sm">No files found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {currentPath && (
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
                  onClick={() => {
                    const parent = currentPath.split("/").filter(Boolean).slice(0, -1).join("/");
                    navigateTo(parent ? parent + "/" : "");
                  }}
                >
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">..</span>
                </button>
              )}
              {sorted.map((file) => {
                const Icon = getFileIcon(file);
                const isSelected = selected?.path === file.path && selected?.name === file.name;
                return (
                  <button
                    key={file.path + file.name}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      file.is_directory ? "hover:bg-muted/50 cursor-pointer" : "hover:bg-muted/50 cursor-pointer",
                      isSelected && "bg-primary/10 border-l-2 border-primary"
                    )}
                    onClick={() => {
                      if (file.is_directory) {
                        navigateTo(file.path + file.name + "/");
                      } else {
                        setSelected(file);
                      }
                    }}
                    onDoubleClick={() => {
                      if (!file.is_directory && file.cdn_url) {
                        onSelect(file.cdn_url, file.name);
                        onOpenChange(false);
                      }
                    }}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", getIconColor(file))} />
                    <span className="flex-1 text-sm truncate">{file.name}</span>
                    {!file.is_directory && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatBytes(file.size)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Selected file info */}
        {selected && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 truncate">
            Selected: <span className="font-medium text-foreground">{selected.name}</span>
            {selected.cdn_url && (
              <span className="ml-2 text-primary truncate">→ {selected.cdn_url}</span>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSelect} disabled={!selected || !selected.cdn_url}>
            Select File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
