<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class OcrController extends Controller
{
    public function scanSerial(Request $request)
    {
        $request->validate([
            'image' => 'required|string',
        ]);

        $apiKey = config('services.gemini.api_key');

        if (!$apiKey) {
            return response()->json(['error' => 'Gemini API key not configured'], 500);
        }

        try {
            $imageData = $request->input('image');
            
            // Extract base64 data if it's a data URL
            if (str_contains($imageData, ',')) {
                $imageData = explode(',', $imageData, 2)[1];
            }

            $response = Http::timeout(30)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}",
                [
                    'contents' => [
                        [
                            'parts' => [
                                [
                                    'text' => 'Extract the serial number from this image. This is likely a MacBook/laptop "About This Mac" screen or a product label. Return ONLY the serial number value, nothing else. No explanation, no quotes, just the serial number string. If you cannot find a serial number, respond with NONE.',
                                ],
                                [
                                    'inline_data' => [
                                        'mime_type' => 'image/jpeg',
                                        'data' => $imageData,
                                    ],
                                ],
                            ],
                        ],
                    ],
                ]
            );

            if (!$response->successful()) {
                return response()->json(['error' => 'Gemini API request failed'], 500);
            }

            $result = $response->json();
            $serial = $result['candidates'][0]['content']['parts'][0]['text'] ?? 'NONE';
            $serial = trim($serial);

            return response()->json(['serial' => $serial]);

        } catch (\Exception $e) {
            return response()->json(['error' => 'OCR processing failed: ' . $e->getMessage()], 500);
        }
    }
}
