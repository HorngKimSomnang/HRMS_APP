<?php
$files = [
    'LARAVEL/app/Http/Controllers/Api/LeaveController.php',
    'LARAVEL/app/Http/Controllers/Api/TaskController.php',
    'LARAVEL/app/Http/Controllers/Api/ReportController.php',
    'LARAVEL/app/Http/Controllers/Api/EmployeeController.php',
    'LARAVEL/app/Http/Controllers/Api/DocumentController.php',
    'LARAVEL/app/Http/Controllers/Api/PayslipController.php',
    'LARAVEL/app/Http/Controllers/Api/OvertimeController.php',
    'LARAVEL/app/Http/Controllers/ContractController.php',
    'LARAVEL/app/Http/Controllers/Api/LifecycleController.php'
];

foreach ($files as $file) {
    if (file_exists($file)) {
        $content = file_get_contents($file);
        
        // whereHas('employee' -> whereHas('employee.user'
        $content = str_replace(
            "whereHas('employee', function (\$q) use (\$managedIds) {
                    \$q->whereIn('department_id', \$managedIds);
                })",
            "whereHas('employee.user', function (\$q) use (\$managedIds) {
                    \$q->whereIn('department_id', \$managedIds);
                })",
            $content
        );

        $content = str_replace(
            "whereHas('employee', fn(\$q) => \$q->whereIn('department_id', \$managedIds))",
            "whereHas('employee.user', fn(\$q) => \$q->whereIn('department_id', \$managedIds))",
            $content
        );
        
        $content = preg_replace(
            "/(whereHas\(['\"]employee['\"],\s*function\s*\(\\$q\)\s*use\s*\(\\$managedIds\)\s*\{\s*\\$q->whereIn\(['\"]department_id['\"],\s*\\$managedIds\);\s*\}\))/i",
            "whereHas('employee.user', function (\$q) use (\$managedIds) { \$q->whereIn('department_id', \$managedIds); })",
            $content
        );
        
        // EmployeeController handles Employee directly:
        if (strpos($file, 'EmployeeController') !== false || strpos($file, 'DocumentController') !== false) {
             // In EmployeeController and DocumentController, the query is likely on Employee model directly.
             $content = str_replace(
                 "->whereIn('department_id', \$managedIds)",
                 "->whereHas('user', function(\$q) use (\$managedIds) { \$q->whereIn('department_id', \$managedIds); })",
                 $content
             );
        }

        // Fix Lifecycle and Contracts with eager loading
        $content = str_replace('employee:id,first_name,last_name,job_title,department_id', 'employee.user:id,department_id', $content);
        $content = str_replace("select('id', 'first_name', 'last_name', 'job_title', 'department_id')", "select('id', 'first_name', 'last_name', 'job_title', 'user_id')->with('user:id,department_id')", $content);

        file_put_contents($file, $content);
    }
}
echo "Done";
