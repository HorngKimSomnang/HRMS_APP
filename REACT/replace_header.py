with open('REACT/src/pages/employees/EmployeeList.tsx', 'r') as f:
    content = f.read()

old_header = """            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('employees.title')}</h2>
                    <p className="text-muted-foreground">{t('employees.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">

                {viewMode === 'current' && canManageAccess && (
                    <Button
                        className={`gap-2 border shadow-sm transition-all ${
                            selectedAccessEmployee 
                                ? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-300' 
                                : 'border-slate-200 bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed'
                        }`}
                        disabled={!selectedAccessEmployee}
                        onClick={() => selectedAccessEmployee && openAccessModal(selectedAccessEmployee)}
                        title={selectedAccessEmployee ? `Manage access for ${selectedAccessEmployee.last_name} ${selectedAccessEmployee.first_name}` : 'Select an employee row first'}
                    >
                        <Shield className="h-4 w-4" />
                        {selectedAccessEmployee ? `${selectedAccessEmployee.last_name} Access` : 'Add Access'}
                    </Button>
                )}
                {viewMode === 'current' && (
                    <Button className="gap-2" onClick={() => navigate('/employees/create')}>
                        <Plus className="h-4 w-4" /> {t('employees.add_employee')}
                    </Button>
                )}
                </div>
            </div>"""

new_header = """            <div className="sticky -top-6 lg:-top-8 z-40 -mx-6 lg:-mx-8 px-6 lg:px-8 pb-4 lg:pb-6 bg-slate-50/95 backdrop-blur-md border-b border-blue-100/50 shadow-sm transition-all duration-200">
                <PageHeader 
                    className="mb-0"
                    title={t('employees.title')}
                    subtitle={t('employees.subtitle')}
                    gradient="from-blue-600 via-indigo-600 to-violet-600"
                    action={
                        <div className="flex items-center gap-2">
                            {viewMode === 'current' && canManageAccess && (
                                <Button
                                    className={`gap-2 border-none shadow-md transition-all ${
                                        selectedAccessEmployee 
                                            ? 'bg-white text-indigo-600 hover:bg-gray-100' 
                                            : 'bg-white/20 text-white cursor-not-allowed opacity-80'
                                    }`}
                                    disabled={!selectedAccessEmployee}
                                    onClick={() => selectedAccessEmployee && openAccessModal(selectedAccessEmployee)}
                                    title={selectedAccessEmployee ? `Manage access for ${selectedAccessEmployee.last_name} ${selectedAccessEmployee.first_name}` : 'Select an employee row first'}
                                >
                                    <Shield className="h-4 w-4" />
                                    {selectedAccessEmployee ? `${selectedAccessEmployee.last_name} Access` : 'Add Access'}
                                </Button>
                            )}
                            {viewMode === 'current' && (
                                <Button 
                                    className="gap-2 bg-white text-indigo-600 hover:bg-gray-100 border-none shadow-md transition-all" 
                                    onClick={() => navigate('/employees/create')}
                                >
                                    <Plus className="h-4 w-4" /> {t('employees.add_employee')}
                                </Button>
                            )}
                        </div>
                    }
                />
            </div>"""

if old_header in content:
    content = content.replace(old_header, new_header)
else:
    print("WARNING: Could not find exact header to replace. Generating exact match...")
    # fallback with regex or simpler replace
    import re
    content = re.sub(r'<div className="flex items-center justify-between">.*?</div>\s*</div>', new_header, content, flags=re.DOTALL | re.MULTILINE)

with open('REACT/src/pages/employees/EmployeeList.tsx', 'w') as f:
    f.write(content)

