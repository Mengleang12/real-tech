<?php

namespace App\Http\Controllers;

use App\Models\Slider;
use Illuminate\Http\Request;

class SliderController extends Controller
{
    // Public: get active sliders
    public function index()
    {
        $sliders = Slider::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json(['sliders' => $sliders]);
    }

    // Admin: get all sliders
    public function adminIndex()
    {
        $sliders = Slider::orderBy('sort_order')->get();
        return response()->json(['sliders' => $sliders]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'title_km' => 'nullable|string|max:255',
            'subtitle' => 'nullable|string|max:500',
            'subtitle_km' => 'nullable|string|max:500',
            'badge' => 'nullable|string|max:100',
            'badge_km' => 'nullable|string|max:100',
            'image_url' => 'required|string',
            'link_url' => 'nullable|string|max:500',
            'accent_color' => 'nullable|string|max:20',
            'gradient' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $slider = Slider::create($validated);

        return response()->json(['success' => true, 'slider' => $slider], 201);
    }

    public function update(Request $request, $id)
    {
        $slider = Slider::findOrFail($id);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'title_km' => 'nullable|string|max:255',
            'subtitle' => 'nullable|string|max:500',
            'subtitle_km' => 'nullable|string|max:500',
            'badge' => 'nullable|string|max:100',
            'badge_km' => 'nullable|string|max:100',
            'image_url' => 'sometimes|required|string',
            'link_url' => 'nullable|string|max:500',
            'accent_color' => 'nullable|string|max:20',
            'gradient' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $slider->update($validated);

        return response()->json(['success' => true, 'slider' => $slider]);
    }

    public function destroy($id)
    {
        $slider = Slider::findOrFail($id);
        $slider->delete();

        return response()->json(['success' => true, 'message' => 'Slider deleted']);
    }

    public function reorder(Request $request)
    {
        $request->validate([
            'order' => 'required|array',
            'order.*' => 'integer|exists:sliders,id',
        ]);

        foreach ($request->order as $index => $id) {
            Slider::where('id', $id)->update(['sort_order' => $index]);
        }

        return response()->json(['success' => true]);
    }
}
