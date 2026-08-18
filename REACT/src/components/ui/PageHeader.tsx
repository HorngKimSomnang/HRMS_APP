import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  gradient?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  subtitle, 
  gradient = "from-emerald-500 via-teal-600 to-cyan-600",
  action,
  className = ""
}: PageHeaderProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${gradient} p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between mb-6 ${className}`}>
      <div className="relative z-10 flex-1">
        <h1 className="text-2xl sm:text-3xl font-bold font-poppins tracking-tight">{title}</h1>
        <p className="mt-2 text-sm font-medium text-white/90">{subtitle}</p>
      </div>
      {action && (
        <div className="relative z-10">
          {action}
        </div>
      )}
      {/* Decorative Pattern */}
      <div className="absolute right-0 top-0 h-full w-1/3 opacity-20 pointer-events-none">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="h-[200%] w-[200%] absolute right-[-20%] top-[-50%] object-cover">
              <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.3C93.5,8.6,82.2,21.5,70.9,32.2C59.6,42.9,48.3,51.4,36.4,58.5C24.5,65.6,11.9,71.3,-1.2,73.4C-14.3,75.5,-29.6,74,-42.6,67.3C-55.6,60.6,-66.3,48.7,-74.8,35.3C-83.3,21.9,-89.6,7,-87.8,-7.1C-86,-21.2,-76.1,-34.5,-64.8,-45.5C-53.5,-56.5,-40.8,-65.2,-27.5,-73.1C-14.2,-81,-0.3,-88.1,13.8,-88C28,-87.9,40,-80.6,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
      </div>
    </div>
  );
}
