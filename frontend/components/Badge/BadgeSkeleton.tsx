'use client';

export function BadgeSkeleton() {
  return (
    <div className="glass-card p-6 animate-pulse">
      <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-purple-500/20" />
      <div className="space-y-3">
        <div className="h-5 bg-purple-500/20 rounded w-24 mx-auto" />
        <div className="h-4 bg-purple-500/20 rounded w-32 mx-auto" />
        <div className="h-2 bg-purple-500/20 rounded-full w-full" />
        <div className="h-3 bg-purple-500/20 rounded w-20 mx-auto" />
      </div>
    </div>
  );
}