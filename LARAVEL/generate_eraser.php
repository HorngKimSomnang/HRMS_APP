<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$tables = DB::select("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");

$eraserCode = "";

foreach ($tables as $tableObj) {
    $table = $tableObj->tablename;
    
    // Skip migration/system tables
    if (in_array($table, ['migrations', 'personal_access_tokens', 'failed_jobs', 'password_reset_tokens', 'cache', 'cache_locks', 'jobs', 'job_batches'])) {
        continue;
    }
    
    $eraserCode .= $table . " {\n";
    
    $columns = DB::select("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table' ORDER BY ordinal_position");
    
    foreach ($columns as $column) {
        $colName = $column->column_name;
        $type = $column->data_type;
        $typeStr = match($type) {
            'integer', 'bigint', 'smallint' => 'int',
            'character varying', 'text' => 'string',
            'timestamp without time zone', 'date' => 'datetime',
            'boolean' => 'bool',
            'numeric' => 'decimal',
            'json', 'jsonb' => 'json',
            default => 'string'
        };
        
        $pk = ($colName === 'id') ? ' [pk]' : '';
        $eraserCode .= "  " . $colName . " " . $typeStr . $pk . "\n";
    }
    $eraserCode .= "}\n\n";
}

// Get foreign keys
$fks = DB::select("
    SELECT
        tc.table_name AS table_name,
        kcu.column_name AS column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
");

foreach ($fks as $fk) {
    if (in_array($fk->table_name, ['migrations', 'personal_access_tokens', 'failed_jobs', 'password_reset_tokens', 'cache', 'cache_locks', 'jobs', 'job_batches'])) continue;
    if (in_array($fk->foreign_table_name, ['migrations', 'personal_access_tokens', 'failed_jobs', 'password_reset_tokens', 'cache', 'cache_locks', 'jobs', 'job_batches'])) continue;
    
    // Eraser relationship syntax: Table1.id < Table2.table1_id
    $eraserCode .= $fk->foreign_table_name . "." . $fk->foreign_column_name . " < " . $fk->table_name . "." . $fk->column_name . "\n";
}

file_put_contents('eraser_erd.txt', $eraserCode);
echo "Done";
