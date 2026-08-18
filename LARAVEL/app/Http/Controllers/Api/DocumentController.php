<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $managedDepartmentIds = $user->managedDepartments()->pluck('departments.id')->toArray();
        if (empty($managedDepartmentIds)) {
            $employee = Employee::find($user->employee?->id ?? -1);
            return response()->json($employee ? $this->formatEmployeeDocuments($employee) : []);
        }

        $documents = [];
        Employee::select(['id', 'first_name', 'last_name', 'profile_picture', 'documents'])
            ->whereHas('user', function ($q) use ($managedDepartmentIds) {
                $q->whereIn('department_id', $managedDepartmentIds);
            })
            ->chunkById(100, function ($employees) use (&$documents) {
                foreach ($employees as $employee) {
                    $documents = array_merge($documents, $this->formatEmployeeDocuments($employee, true));
                }
            });

        usort($documents, fn ($a, $b) => strcmp($b['created_at'], $a['created_at']));

        return response()->json($documents);
    }

    public function show($id)
    {
        $located = $this->locateDocument((int) $id);
        if (!$located) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        /** @var Employee $employee */
        $employee = $located['employee'];
        $document = ($employee->documents ?? [])[$located['index']] ?? null;

        if (!$document) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        $user = Auth::user();
        $managedDepartmentIds = $user->managedDepartments()->pluck('departments.id')->toArray();
        $isManaged = !empty($managedDepartmentIds) && in_array($employee->user?->department_id, $managedDepartmentIds);
        if (!$isManaged && (int) ($user->employee?->id ?? 0) !== (int) $employee->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($this->formatDocument($document, $employee, true));
    }

    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'name' => 'required|string',
            'file' => 'required|file|mimes:pdf,doc,docx,jpg,png|max:2048',
            'type' => 'nullable|string',
        ]);

        $path = $request->file('file')->store('documents', 'public');
        $employee = Employee::findOrFail($request->employee_id);
        $documentsField = $employee->documents ?? [];
        $documents = $documentsField['attachments'] ?? [];
        $nextId = $this->nextDocumentId();

        $document = [
            'id' => $nextId,
            'employee_id' => $request->employee_id,
            'name' => $request->name,
            'file_path' => $path,
            'type' => $request->type,
            'created_at' => now()->toISOString(),
        ];

        $documents[] = $document;
        $documentsField['attachments'] = array_values($documents);
        $employee->documents = $documentsField;
        $employee->save();

        if ($employee->user) {
            $employee->user->notify(new \App\Notifications\DocumentUploadedNotification($document));
        }

        return response()->json($this->formatDocument($document, $employee, true), 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'sometimes|required|string',
            'type' => 'nullable|string',
        ]);

        $located = $this->locateDocument((int) $id);
        if (!$located) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        /** @var Employee $employee */
        $employee = $located['employee'];
        $documentsField = $employee->documents ?? [];
        $documents = $documentsField['attachments'] ?? [];
        $index = $located['index'];

        if ($request->has('name')) {
            $documents[$index]['name'] = $request->name;
        }
        if ($request->has('type')) {
            $documents[$index]['type'] = $request->type;
        }

        $documentsField['attachments'] = array_values($documents);
        $employee->documents = $documentsField;
        $employee->save();

        return response()->json($this->formatDocument($documents[$index], $employee, true));
    }

    public function destroy($id)
    {
        $located = $this->locateDocument((int) $id);
        if (!$located) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        /** @var Employee $employee */
        $employee = $located['employee'];
        $documentsField = $employee->documents ?? [];
        $documents = $documentsField['attachments'] ?? [];
        $index = $located['index'];
        $document = $documents[$index];

        if (!empty($document['file_path'])) {
            Storage::disk('public')->delete($document['file_path']);
        } elseif (!empty($document['path'])) {
            Storage::disk('public')->delete($document['path']);
        }

        array_splice($documents, $index, 1);
        $documentsField['attachments'] = array_values($documents);
        $employee->documents = $documentsField;
        $employee->save();

        return response()->json(['message' => 'Document deleted']);
    }

    private function formatEmployeeDocuments(Employee $employee, bool $includeEmployee = false): array
    {
        $documentsField = $employee->documents ?? [];
        $documents = $documentsField['attachments'] ?? [];

        return array_map(fn ($document) => $this->formatDocument($document, $employee, $includeEmployee), $documents);
    }

    private function formatDocument(array $document, Employee $employee, bool $includeEmployee = false): array
    {
        $docId = $document['id'] ?? null;
        if ($docId === null) {
            $docId = crc32($document['path'] ?? $document['file_path'] ?? json_encode($document));
        }

        $payload = [
            'id' => (int) $docId,
            'employee_id' => (int) $employee->id,
            'name' => (string) ($document['name'] ?? ''),
            'type' => $document['type'] ?? null,
            'file_path' => $document['file_path'] ?? $document['path'] ?? null,
            'created_at' => $document['created_at'] ?? now()->toISOString(),
        ];

        if ($includeEmployee) {
            $payload['employee'] = ['name' => $employee->name];
        }

        return $payload;
    }

    private function locateDocument(int $id): ?array
    {
        $result = null;

        Employee::select(['id', 'first_name', 'last_name', 'profile_picture', 'documents'])
            ->chunkById(100, function ($employees) use ($id, &$result) {
                if ($result !== null) {
                    return false; // stop chunking once found
                }
                foreach ($employees as $employee) {
                    $documentsField = $employee->documents ?? [];
                    $documents = $documentsField['attachments'] ?? [];
                    foreach ($documents as $index => $document) {
                        $docId = $document['id'] ?? null;
                        if ($docId === null) {
                            $docId = crc32($document['path'] ?? $document['file_path'] ?? json_encode($document));
                        }
                        if ((int) $docId === $id) {
                            $result = ['employee' => $employee, 'index' => $index];
                            return false; // stop inner chunk
                        }
                    }
                }
            });

        return $result;
    }

    private function nextDocumentId(): int
    {
        $maxId = 0;

        Employee::query()->chunkById(200, function ($employees) use (&$maxId) {
            foreach ($employees as $employee) {
                $documentsField = $employee->documents ?? [];
                $documents = $documentsField['attachments'] ?? [];
                foreach ($documents as $document) {
                    $maxId = max($maxId, (int) ($document['id'] ?? 0));
                }
            }
        });

        return $maxId + 1;
    }
}
