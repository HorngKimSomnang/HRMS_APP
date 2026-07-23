<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\Process\Process;
use Throwable;

class BackupController extends Controller
{
    public function status(): JsonResponse
    {
        return response()->json(['data' => $this->buildStatus()]);
    }

    public function store(Request $request): JsonResponse
    {
        $lock = Cache::lock('hrms-manual-backup', 180);

        if (! $lock->get()) {
            return response()->json([
                'message' => 'A backup is already running. Please wait a moment and refresh the status.',
            ], 409);
        }

        try {
            $before = $this->latestDump();
            $process = new Process([
                $this->taskSchedulerExecutable(),
                '/Run',
                '/TN',
                'HRMS DB Backup',
            ]);
            $process->setTimeout(15);
            $process->run();

            if (! $process->isSuccessful()) {
                report(new \RuntimeException(trim($process->getErrorOutput() ?: $process->getOutput())));

                return response()->json([
                    'message' => 'The Windows backup task could not be started. Check that HRMS DB Backup is installed.',
                ], 500);
            }

            $completed = $this->waitForNewDump($before, 90);
            if (! $completed) {
                return response()->json([
                    'message' => 'The backup task started but did not produce a new recovery point within 90 seconds.',
                ], 504);
            }

            $status = $this->buildStatus();

            AuditLogger::log($request, 'SYSTEM_BACKUP_CREATED', null, [
                'file' => $status['latest']['filename'] ?? null,
                'size_bytes' => $status['latest']['size_bytes'] ?? null,
            ]);

            return response()->json([
                'message' => 'Database and uploaded files were backed up successfully.',
                'data' => $status,
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'The backup could not be started. Check the Laravel log for details.',
            ], 500);
        } finally {
            $lock->release();
        }
    }

    private function buildStatus(): array
    {
        $backupDirectory = $this->backupDirectory();
        $dumps = glob($backupDirectory.DIRECTORY_SEPARATOR.'HRMS_*.dump') ?: [];

        usort($dumps, fn (string $left, string $right) => filemtime($right) <=> filemtime($left));

        $latestPath = $dumps[0] ?? null;
        $latestTime = $latestPath ? Carbon::createFromTimestamp(filemtime($latestPath)) : null;
        $schedule = $this->scheduledTaskStatus();
        $isRecent = $latestTime?->greaterThan(now()->subHours(48)) ?? false;

        return [
            'healthy' => $isRecent && ($schedule['installed'] ?? false),
            'latest' => $latestPath ? [
                'filename' => basename($latestPath),
                'created_at' => $latestTime?->toIso8601String(),
                'size_bytes' => filesize($latestPath),
                'size_label' => $this->formatBytes(filesize($latestPath)),
            ] : null,
            'backup_count' => count($dumps),
            'uploaded_files_included' => is_dir($backupDirectory.DIRECTORY_SEPARATOR.'storage_files'),
            'schedule' => $schedule,
            'retention' => 'Five newest copies are always kept; older copies are removed after 30 days.',
            'restore_protection' => 'Restore requires an explicit YES confirmation outside the web application.',
        ];
    }

    private function scheduledTaskStatus(): array
    {
        try {
            $process = new Process([
                $this->taskSchedulerExecutable(),
                '/Query',
                '/TN',
                'HRMS DB Backup',
            ]);
            $process->setTimeout(10);
            $process->run();

            return [
                'installed' => $process->isSuccessful(),
                'state' => $process->isSuccessful() ? 'Scheduled' : null,
                'last_run_at' => null,
                'next_run_at' => null,
            ];
        } catch (Throwable) {
            return ['installed' => false];
        }
    }

    private function latestDump(): ?array
    {
        $dumps = glob($this->backupDirectory().DIRECTORY_SEPARATOR.'HRMS_*.dump') ?: [];
        usort($dumps, fn (string $left, string $right) => filemtime($right) <=> filemtime($left));

        if (! isset($dumps[0])) {
            return null;
        }

        clearstatcache(true, $dumps[0]);

        return [
            'path' => $dumps[0],
            'modified_at' => filemtime($dumps[0]),
            'size' => filesize($dumps[0]),
        ];
    }

    private function waitForNewDump(?array $before, int $timeoutSeconds): bool
    {
        $deadline = microtime(true) + $timeoutSeconds;

        do {
            usleep(500_000);
            $latest = $this->latestDump();

            if ($latest && (
                $before === null
                || $latest['path'] !== $before['path']
                || $latest['modified_at'] > $before['modified_at']
                || $latest['size'] !== $before['size']
            )) {
                return true;
            }
        } while (microtime(true) < $deadline);

        return false;
    }

    private function taskSchedulerExecutable(): string
    {
        $windowsDirectory = getenv('SystemRoot') ?: 'C:\\Windows';

        return $windowsDirectory.DIRECTORY_SEPARATOR.'System32'.DIRECTORY_SEPARATOR.'schtasks.exe';
    }

    private function backupDirectory(): string
    {
        return dirname(base_path()).DIRECTORY_SEPARATOR.'backups';
    }

    private function formatBytes(int|false $bytes): string
    {
        if (! is_int($bytes) || $bytes < 1024) {
            return ((int) $bytes).' B';
        }

        if ($bytes < 1024 * 1024) {
            return round($bytes / 1024).' KB';
        }

        return round($bytes / (1024 * 1024), 1).' MB';
    }
}
