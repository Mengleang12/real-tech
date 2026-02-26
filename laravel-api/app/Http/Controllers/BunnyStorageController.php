<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class BunnyStorageController extends Controller
{
    private function getSetting(string $key, string $envKey, string $default = ''): string
    {
        $dbValue = SystemSetting::getValue($key);
        if ($dbValue !== null && $dbValue !== '') {
            return $dbValue;
        }
        return env($envKey, $default);
    }

    private function getCredentials(): array
    {
        return [
            'api_key' => $this->getSetting('bunny_api_key', 'BUNNY_STORAGE_API_KEY'),
            'zone_name' => $this->getSetting('bunny_zone_name', 'BUNNY_STORAGE_ZONE_NAME'),
            'storage_host' => $this->getSetting('bunny_storage_host', 'BUNNY_STORAGE_HOSTNAME'),
            'cdn_host' => $this->getSetting('bunny_cdn_host', 'BUNNY_CDN_HOSTNAME'),
        ];
    }

    private function maskKey(?string $key): ?string
    {
        if (empty($key)) return null;
        $len = strlen($key);
        if ($len <= 8) return str_repeat('•', $len);
        return str_repeat('•', $len - 4) . substr($key, -4);
    }

    public function config(): JsonResponse
    {
        $c = $this->getCredentials();
        $tokenAuthKey = SystemSetting::getValue('bunny_token_auth_key');
        $tokenExpiry = SystemSetting::getValue('bunny_token_expiry', '3600');
        return response()->json([
            'zone_name' => $c['zone_name'],
            'storage_host' => $c['storage_host'],
            'cdn_host' => $c['cdn_host'],
            'configured' => !empty($c['api_key']) && !empty($c['zone_name']) && !empty($c['storage_host']),
            'token_auth_configured' => !empty($tokenAuthKey),
            'token_expiry' => (int) $tokenExpiry,
            'api_key_masked' => $this->maskKey($c['api_key']),
            'token_auth_key_masked' => $this->maskKey($tokenAuthKey),
        ]);
    }

    /**
     * Return full Bunny credentials including API key (admin-only, for direct uploads).
     */
    public function credentials(): JsonResponse
    {
        $c = $this->getCredentials();
        if (empty($c['api_key']) || empty($c['zone_name']) || empty($c['storage_host'])) {
            return response()->json(['error' => 'Bunny Storage not configured.'], 400);
        }
        return response()->json([
            'api_key' => $c['api_key'],
            'zone_name' => $c['zone_name'],
            'storage_host' => $c['storage_host'],
            'cdn_host' => $c['cdn_host'],
        ]);
    }

    public function updateConfig(Request $request): JsonResponse
    {
        $request->validate([
            'zone_name' => 'nullable|string|max:255',
            'storage_host' => 'nullable|string|max:255',
            'cdn_host' => 'nullable|string|max:255',
            'api_key' => 'nullable|string|max:500',
            'token_auth_key' => 'nullable|string|max:500',
            'token_expiry' => 'nullable|string|max:10',
        ]);

        $mappings = [
            'zone_name' => 'bunny_zone_name',
            'storage_host' => 'bunny_storage_host',
            'cdn_host' => 'bunny_cdn_host',
            'api_key' => 'bunny_api_key',
            'token_auth_key' => 'bunny_token_auth_key',
            'token_expiry' => 'bunny_token_expiry',
        ];

        foreach ($mappings as $inputKey => $settingKey) {
            if ($request->has($inputKey)) {
                SystemSetting::setValue($settingKey, $request->input($inputKey));
            }
        }

        return response()->json(['message' => 'Bunny Storage settings updated successfully']);
    }

    public function test(): JsonResponse
    {
        $c = $this->getCredentials();

        if (empty($c['api_key']) || empty($c['zone_name']) || empty($c['storage_host'])) {
            return response()->json([
                'success' => false,
                'error' => 'Bunny Storage not configured.',
            ], 400);
        }

        try {
            $response = Http::withHeaders(['AccessKey' => $c['api_key']])
                ->get("https://{$c['storage_host']}/{$c['zone_name']}/");

            if ($response->successful()) {
                $files = $response->json();
                return response()->json([
                    'success' => true,
                    'message' => 'Connection successful!',
                    'zone_name' => $c['zone_name'],
                    'storage_host' => $c['storage_host'],
                    'cdn_host' => $c['cdn_host'] ?: 'Not configured',
                    'file_count' => is_array($files) ? count($files) : 0,
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => "Connection failed ({$response->status()}): {$response->body()}",
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Connection test failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * List files/folders in a given path.
     */
    public function listFiles(Request $request): JsonResponse
    {
        $c = $this->getCredentials();
        if (empty($c['api_key']) || empty($c['zone_name']) || empty($c['storage_host'])) {
            return response()->json(['error' => 'Bunny Storage not configured.'], 400);
        }

        $path = trim($request->query('path', ''), '/');
        $url = "https://{$c['storage_host']}/{$c['zone_name']}/{$path}/";

        try {
            $response = Http::withHeaders(['AccessKey' => $c['api_key']])->get($url);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to list files: ' . $response->body()], $response->status());
            }

            $items = $response->json() ?? [];
            $cdnBase = $c['cdn_host'] ? "https://{$c['cdn_host']}" : null;

            $files = array_map(function ($item) use ($cdnBase) {
                $isDir = $item['IsDirectory'] ?? false;
                $objectName = $item['ObjectName'] ?? '';
                $fullPath = $item['Path'] ?? '';
                // Build relative path inside storage zone
                $parts = explode('/', trim($fullPath, '/'));
                // Remove zone name (first segment)
                array_shift($parts);
                $relativePath = implode('/', $parts);

                return [
                    'name' => $objectName,
                    'path' => $relativePath ? "{$relativePath}/{$objectName}" : $objectName,
                    'is_directory' => $isDir,
                    'size' => $item['Length'] ?? 0,
                    'last_changed' => $item['LastChanged'] ?? null,
                    'cdn_url' => (!$isDir && $cdnBase) ? "{$cdnBase}/{$relativePath}/{$objectName}" : null,
                ];
            }, $items);

            return response()->json(['files' => $files, 'current_path' => $path]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to list files: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Upload a file to a given path.
     */
    public function uploadFile(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:102400', // 100MB
            'path' => 'nullable|string',
        ]);

        $c = $this->getCredentials();
        if (empty($c['api_key']) || empty($c['zone_name']) || empty($c['storage_host'])) {
            return response()->json(['error' => 'Bunny Storage not configured.'], 400);
        }

        $file = $request->file('file');
        $path = trim($request->input('path', ''), '/');
        $fileName = $file->getClientOriginalName();
        $fullPath = $path ? "{$path}/{$fileName}" : $fileName;

        try {
            $response = Http::withHeaders([
                'AccessKey' => $c['api_key'],
                'Content-Type' => 'application/octet-stream',
            ])->withBody(
                file_get_contents($file->getRealPath()),
                'application/octet-stream'
            )->put("https://{$c['storage_host']}/{$c['zone_name']}/{$fullPath}");

            if ($response->successful()) {
                $cdnUrl = $c['cdn_host'] ? "https://{$c['cdn_host']}/{$fullPath}" : null;
                return response()->json([
                    'success' => true,
                    'message' => 'File uploaded successfully',
                    'path' => $fullPath,
                    'cdn_url' => $cdnUrl,
                ]);
            }

            return response()->json(['error' => 'Upload failed: ' . $response->body()], 400);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Upload failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Create a folder.
     */
    public function createFolder(Request $request): JsonResponse
    {
        $request->validate([
            'path' => 'required|string|max:500',
        ]);

        $c = $this->getCredentials();
        if (empty($c['api_key']) || empty($c['zone_name']) || empty($c['storage_host'])) {
            return response()->json(['error' => 'Bunny Storage not configured.'], 400);
        }

        $path = trim($request->input('path'), '/');

        // Bunny creates folders implicitly by uploading a 0-byte placeholder
        // But we can also just PUT to a path ending with /
        try {
            $response = Http::withHeaders([
                'AccessKey' => $c['api_key'],
                'Content-Type' => 'application/octet-stream',
            ])->withBody('', 'application/octet-stream')
              ->put("https://{$c['storage_host']}/{$c['zone_name']}/{$path}/.folder_placeholder");

            if ($response->successful()) {
                return response()->json(['success' => true, 'message' => 'Folder created', 'path' => $path]);
            }

            return response()->json(['error' => 'Failed to create folder: ' . $response->body()], 400);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to create folder: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete a file or folder.
     */
    public function deleteFile(Request $request): JsonResponse
    {
        $request->validate([
            'path' => 'required|string',
            'is_directory' => 'boolean',
        ]);

        $c = $this->getCredentials();
        if (empty($c['api_key']) || empty($c['zone_name']) || empty($c['storage_host'])) {
            return response()->json(['error' => 'Bunny Storage not configured.'], 400);
        }

        $path = trim($request->input('path'), '/');
        $isDir = $request->input('is_directory', false);

        // For directories, append trailing slash
        $deletePath = $isDir ? "{$path}/" : $path;

        try {
            $response = Http::withHeaders(['AccessKey' => $c['api_key']])
                ->delete("https://{$c['storage_host']}/{$c['zone_name']}/{$deletePath}");

            if ($response->successful()) {
                return response()->json(['success' => true, 'message' => $isDir ? 'Folder deleted' : 'File deleted']);
            }

            return response()->json(['error' => 'Delete failed: ' . $response->body()], 400);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Delete failed: ' . $e->getMessage()], 500);
        }
    }
}
