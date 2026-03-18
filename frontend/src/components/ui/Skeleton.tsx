import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  circle?: boolean;
}

export function Skeleton({ className = '', circle = false, ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-ink-100/80 ${circle ? 'rounded-full' : 'rounded-xl'} ${className}`}
      {...props}
    />
  );
}

// Pre-composed Skeleton layouts for faster assembly
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm sm:p-5 ${className}`}>
      <Skeleton className="mb-4 h-4 w-1/3" />
      <Skeleton className="mb-2 h-8 w-1/2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}

export function DashboardSkeletons() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-20 lg:pb-6">
      {/* Greetings section skeleton */}
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm sm:p-5">
        <Skeleton className="mb-2 h-3 w-32" />
        <Skeleton className="mb-2 h-8 w-64" />
        <Skeleton className="mb-4 h-4 w-48" />
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={`mood-skel-${i}`} className="h-10 w-10 sm:h-12 sm:w-12" />
          ))}
          <Skeleton className="h-10 w-32 sm:h-12" />
          <Skeleton className="h-10 w-40 sm:h-12" />
        </div>
      </div>

      {/* 4-col metrics skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <CardSkeleton key={`metric-skel-${i}`} />
        ))}
      </div>

      {/* 3-col section skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={`plan-skel-${i}`} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft-sm">
            <Skeleton className="mb-4 h-5 w-32" />
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <Skeleton key={`item-${i}-${j}`} className="h-8 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom large grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Main feature card */}
          <div className="h-40 rounded-2xl bg-sage-50/50 p-6">
            <Skeleton className="mb-4 h-6 w-1/4 bg-sage-200/50" />
            <Skeleton className="mb-3 h-8 w-1/3 bg-sage-200/50" />
            <Skeleton className="h-10 w-48 bg-sage-200/50" />
          </div>
          {/* Chart card */}
          <div className="h-64 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft-sm">
             <Skeleton className="mb-4 h-6 w-32" />
             <Skeleton className="h-full w-full" />
          </div>
        </div>
        <div className="space-y-6">
          <CardSkeleton className="h-40" />
          <CardSkeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
