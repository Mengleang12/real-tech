<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|file',
            'type' => 'required|in:icons,screenshots,versions,variants,general',
        ]);

        $type = $request->type;
        $file = $request->file('file');

        // Validate file type
        $allowedMimes = $this->getAllowedMimes($type);
        
        if (!in_array($file->getMimeType(), $allowedMimes)) {
            return response()->json([
                'error' => 'Invalid file type for ' . $type,
            ], 400);
        }

        // Validate file size
        $maxSize = $type === 'versions' ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
        
        if ($file->getSize() > $maxSize) {
            return response()->json([
                'error' => 'File too large. Maximum size is ' . ($maxSize / 1024 / 1024) . 'MB',
            ], 400);
        }

        // Generate unique filename
        $extension = $file->getClientOriginalExtension();
        $filename = uniqid() . '_' . time() . '.' . $extension;

        // Store file
        $path = $file->storeAs("uploads/{$type}", $filename, 'public');

        return response()->json([
            'success' => true,
            'url' => asset('storage/' . $path),
            'filename' => $filename,
            'size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ]);
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:jpeg,png,gif,webp|max:5120',
        ]);

        $file = $request->file('file');
        
        // Generate unique filename
        $extension = $file->getClientOriginalExtension();
        $filename = 'avatar_' . $request->user()->id . '_' . time() . '.' . $extension;

        // Store file
        $path = $file->storeAs("uploads/avatars", $filename, 'public');

        return response()->json([
            'success' => true,
            'url' => asset('storage/' . $path),
            'filename' => $filename,
        ]);
    }

    private function getAllowedMimes(string $type): array
    {
        return match ($type) {
            'icons', 'screenshots', 'variants' => [
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'image/svg+xml',
            ],
            'versions' => [
                'application/zip',
                'application/x-zip-compressed',
                'application/octet-stream',
                'application/x-msdownload',
                'application/x-msdos-program',
                'application/x-apple-diskimage',
                'application/vnd.debian.binary-package',
            ],
            default => [
                'image/jpeg',
                'image/png',
                'image/gif',
                'application/pdf',
                'application/zip',
            ],
        };
    }
}
