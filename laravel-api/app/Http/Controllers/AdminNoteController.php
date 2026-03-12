<?php

namespace App\Http\Controllers;

use App\Models\AdminNote;
use Illuminate\Http\Request;

class AdminNoteController extends Controller
{
    public function index(Request $request)
    {
        $query = AdminNote::query()
            ->orderBy('is_pinned', 'desc')
            ->orderBy('updated_at', 'desc');

        if ($request->has('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('content', 'like', "%{$search}%");
            });
        }

        $notes = $query->get();

        return response()->json($notes);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'nullable|string',
            'category' => 'nullable|string|in:general,delivery,restock,customer,todo',
        ]);

        $note = AdminNote::create([
            'user_id' => $request->user()->id,
            'title' => $request->title,
            'content' => $request->content,
            'category' => $request->category ?? 'general',
        ]);

        return response()->json($note, 201);
    }

    public function update(Request $request, $id)
    {
        $note = AdminNote::findOrFail($id);

        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'content' => 'nullable|string',
            'category' => 'nullable|string|in:general,delivery,restock,customer,todo',
            'is_pinned' => 'sometimes|boolean',
        ]);

        $note->update($request->only(['title', 'content', 'category', 'is_pinned']));

        return response()->json($note);
    }

    public function destroy($id)
    {
        $note = AdminNote::findOrFail($id);
        $note->delete();

        return response()->json(['message' => 'Note deleted']);
    }
}
