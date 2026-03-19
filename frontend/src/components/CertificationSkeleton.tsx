import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className={`animate-pulse bg-slate-200 rounded-lg ${className}`} 
        />
      ))}
    </>
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="p-6 bg-white rounded-2xl border border-slate-100 h-full">
    <Skeleton className="w-12 h-12 rounded-xl mb-4" />
    <Skeleton className="h-6 w-3/4 mb-4" />
    <Skeleton className="h-4 w-1/2 mb-2" />
    <Skeleton className="h-4 w-1/2 mb-6" />
    <div className="flex gap-2">
      <Skeleton className="h-8 w-16 rounded-full" />
    </div>
  </div>
);

export const TextSkeleton: React.FC = () => (
  <div className="space-y-3">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <Skeleton className="h-4 w-4/6" />
  </div>
);
