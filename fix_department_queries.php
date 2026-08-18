<?php
$files = [
    'LARAVEL/app/Http/Controllers/Api/LeaveController.php',
    'LARAVEL/app/Http/Controllers/Api/TaskController.php',
    'LARAVEL/app/Http/Controllers/Api/ReportController.php',
    'LARAVEL/app/Http/Controllers/Api/DocumentController.php',
    'LARAVEL/app/Http/Controllers/Api/PayslipController.php',
    'LARAVEL/app/Http/Controllers/Api/OvertimeController.php',
    'LARAVEL/app/Http/Controllers/Api/LifecycleController.php'
];

foreach ($files as $file) {
    if (file_exists($file)) {
        $content = file_get_contents($file);
        
        $content = str_replace(
            '$user->employee->department_id',
            '$user->department_id',
            $content
        );

        $content = str_replace(
            'Auth::user()->employee->department_id',
            'Auth::user()->department_id',
            $content
        );

        $content = preg_replace(
            "/(whereHas\(['\"]employee['\"],\s*function\s*\(\\$[a-zA-Z_]+\)\s*use\s*\(\\$[a-zA-Z_]+\)\s*\{\s*\\$[a-zA-Z_]+->whereIn\(['\"]department_id['\"],\s*\\$[a-zA-Z_]+\);\s*\}\))/is",
            "whereHas('employee.user', function (\$q) use (\$managedIds) { \$q->whereIn('department_id', \$managedIds); })",
            $content
        );
        
        $content = preg_replace(
            "/(whereHas\(['\"]employee['\"],\s*fn\(\\$[a-zA-Z_]+\)\s*=>\s*\\$[a-zA-Z_]+->whereIn\(['\"]department_id['\"],\s*\\$[a-zA-Z_]+\)\))/is",
            "whereHas('employee.user', fn(\$q) => \$q->whereIn('department_id', \$managedIds))",
            $content
        );

        $content = str_replace(
            'employee:id,first_name,last_name,job_title,department_id',
            'employee.user:id,department_id',
            $content
        );
        $content = str_replace(
            "select('id', 'first_name', 'last_name', 'job_title', 'department_id')",
            "select('id', 'first_name', 'last_name', 'job_title', 'user_id')->with('user:id,department_id')",
            $content
        );

        file_put_contents($file, $content);
    }
}
echo "Done";
