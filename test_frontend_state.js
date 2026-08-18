const user = {
    "role": {
        "name": "Employee"
    },
    "permissions": [
        "dashboard.view_notice_board",
        "employees.view",
        "attendance.view",
        "attendance.create",
        "leaves.view",
        "leaves.create",
        "tasks.view",
        "tasks.create",
        "documents.view",
        "assets.view",
        "overtime.view",
        "overtime.create",
        "payroll.view"
    ]
};

const hasPermission = (permission) => {
    if (!user) return false;
    const isSuperAdmin = user.roles?.some((role) => role?.name === 'Super Admin');
    if (isSuperAdmin) return true;
    const check = (p) => {
        if (!p) return false;
        const name = typeof p === 'string' ? p : p?.name;
        return name === permission;
    };
    const userPermissions = user.permissions || [];
    const directPermissions = user.direct_permissions || [];
    return userPermissions.some(check) || directPermissions.some(check);
};

console.log("hasPermission('dashboard.view_total_employees'):", hasPermission('dashboard.view_total_employees'));
