import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

const getAuthToken = () => {
  return localStorage.getItem('admin_api_key') || localStorage.getItem('auth_token') || '';
};

interface FileUploadProps {
  type: 'icons' | 'screenshots' | 'versions' | 'general';
  onUpload: (url: string) => void;
  currentUrl?: string;
  accept?: string;
  label?: string;
}

export const FileUpload = ({ type, onUpload, currentUrl, accept, label }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    setUploading(true);
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      // Use same fetch pattern as working profile avatar upload
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = 'Upload failed';
        try {
          const data = JSON.parse(text);
          errorMsg = data.error || data.message || errorMsg;
        } catch {
          console.error('Non-JSON response:', text);
          errorMsg = 'Server returned an invalid response. Check API configuration.';
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      onUpload(data.url);
      setPreview(data.url);
      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const clearFile = () => {
    setPreview(null);
    onUpload('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const defaultAccept = type === 'versions' 
    ? '.zip,.rar,.7z,.dmg,.exe,.pkg,.tar.gz' 
    : 'image/*';

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      
      <input
        ref={inputRef}
        type="file"
        accept={accept || defaultAccept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {preview && type !== 'versions' ? (
        <div className="flex items-center gap-3">
          <div className="relative inline-block">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-20 h-20 rounded-xl object-cover border border-border"
            />
            <button
              type="button"
              onClick={clearFile}
              className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center hover:bg-destructive/80"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Change
              </>
            )}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              {type === 'versions' ? <Upload className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
              {type === 'versions' ? 'Upload File' : 'Upload Image'}
            </>
          )}
        </Button>
      )}

      {preview && type === 'versions' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="truncate max-w-xs">{preview.split('/').pop()}</span>
          <button
            type="button"
            onClick={clearFile}
            className="text-destructive hover:text-destructive/80"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

interface ScreenshotUploadProps {
  screenshots: string[];
  onUpdate: (urls: string[]) => void;
}

export const ScreenshotUpload = ({ screenshots, onUpdate }: ScreenshotUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const token = getAuthToken();
    if (!token) {
      toast.error('Not authenticated. Please log in again.');
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'screenshots');

        // Use same fetch pattern as working profile avatar upload
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          body: formData,
        });

        if (!response.ok) {
          console.error('Upload failed for file:', file.name);
          continue;
        }

        const data = await response.json();
        if (data.url) {
          newUrls.push(data.url);
        }
      }

      if (newUrls.length > 0) {
        onUpdate([...screenshots, ...newUrls]);
        toast.success(`${newUrls.length} screenshot(s) uploaded!`);
      } else {
        toast.error('No screenshots were uploaded');
      }
    } catch (error) {
      console.error('Screenshot upload error:', error);
      toast.error('Failed to upload screenshots');
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const removeScreenshot = (index: number) => {
    const updated = screenshots.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Screenshots</p>
      
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesSelect}
        className="hidden"
        disabled={uploading}
      />

      <div className="flex flex-wrap gap-3">
        {screenshots.map((url, index) => (
          <div key={index} className="relative">
            <img
              src={url}
              alt={`Screenshot ${index + 1}`}
              className="w-24 h-16 rounded-lg object-cover border border-border"
            />
            <button
              type="button"
              onClick={() => removeScreenshot(index)}
              className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center hover:bg-destructive/80"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-24 h-16 gap-1 flex-col"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span className="text-xs">Add</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
