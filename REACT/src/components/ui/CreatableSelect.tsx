/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
    label: string;
    value: string | number;
}

interface CreatableSelectProps {
    name: string;
    value: string | number;
    options: (string | Option)[];
    onChange: (e: { target: { name: string; value: string | number } }) => void;
    placeholder?: string;
    required?: boolean;
    creatable?: boolean;
    disabled?: boolean;
}

export function CreatableSelect({ 
    name, 
    value, 
    options, 
    onChange, 
    placeholder, 
    required, 
    creatable = true,
    disabled = false
}: CreatableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Normalize options to object format
    const normalizedOptions = useMemo(() => {
        return options.map(opt => 
            typeof opt === 'object' ? opt : { label: opt, value: opt }
        );
    }, [options]);

    // Sync input value with selected value when component updates from outside
    useEffect(() => {
        if (!isOpen) {
            const selectedOpt = normalizedOptions.find(o => String(o.value) === String(value));
            if (selectedOpt) {
                setInputValue(selectedOpt.label);
            } else if (creatable && value) {
                setInputValue(String(value));
            } else {
                setInputValue('');
            }
        }
    }, [value, normalizedOptions, creatable, isOpen]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                
                // When closing, if creatable is true, we commit the raw input value if it doesn't match an option.
                // If creatable is false, we revert the input back to the selected option's label.
                if (creatable) {
                    const matchedOption = normalizedOptions.find(o => o.label.toLowerCase() === inputValue.toLowerCase());
                    if (matchedOption) {
                        onChange({ target: { name, value: matchedOption.value } });
                    } else if (inputValue !== value) {
                        onChange({ target: { name, value: inputValue } });
                    }
                } else {
                    const selectedOpt = normalizedOptions.find(o => String(o.value) === String(value));
                    if (selectedOpt) {
                        setInputValue(selectedOpt.label);
                    } else {
                        setInputValue('');
                    }
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [inputValue, value, name, onChange, creatable, normalizedOptions]);

    const filteredOptions = normalizedOptions.filter(opt => 
        opt.label.toLowerCase().includes(inputValue.toLowerCase())
    );

    const exactMatch = normalizedOptions.some(opt => opt.label.toLowerCase() === inputValue.toLowerCase());
    const showCreateOption = creatable && inputValue.trim() !== '' && !exactMatch;

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    name={name + '_input'}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setIsOpen(true);
                        // If creatable, trigger onChange immediately with raw text so form state stays in sync
                        // If not creatable, we don't trigger onChange until they explicitly click an option, 
                        // we just let them type to filter.
                        if (creatable) {
                            onChange({ target: { name, value: e.target.value } });
                        }
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    autoComplete="off"
                />
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    disabled={disabled}
                >
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-md border shadow-lg max-h-60 overflow-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt, i) => (
                            <div
                                key={i}
                                className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                    setInputValue(opt.label);
                                    onChange({ target: { name, value: opt.value } });
                                    setIsOpen(false);
                                }}
                            >
                                {opt.label}
                            </div>
                        ))
                    ) : (
                        !showCreateOption && <div className="px-3 py-2 text-sm text-muted-foreground">No options found</div>
                    )}
                    {showCreateOption && (
                        <div
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 text-indigo-600 font-medium"
                            onClick={() => {
                                onChange({ target: { name, value: inputValue } });
                                setIsOpen(false);
                            }}
                        >
                            Create "{inputValue}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
