'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Star, Zap } from 'lucide-react';
import type { EvoDashboardStats } from '@/types';

interface EvoLeaderboardWidgetProps {
  data: EvoDashboardStats | null;
  isLoading?: boolean;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-4 w-4 text-yellow-500" />;
    case 2:
      return <Medal className="h-4 w-4 text-gray-400" />;
    case 3:
      return <Medal className="h-4 w-4 text-amber-600" />;
    default:
      return <span className="w-4 text-center text-sm font-medium text-muted-foreground">{rank}</span>;
  }
};

const getRankBg = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-yellow-50 border-yellow-200';
    case 2:
      return 'bg-gray-50 border-gray-200';
    case 3:
      return 'bg-amber-50 border-amber-200';
    default:
      return 'bg-muted/30';
  }
};

export function EvoLeaderboardWidget({ data, isLoading }: EvoLeaderboardWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            Evo Points Leaderboard
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current User Stats */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-medium">Your Points</span>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-primary">{data.current_user_balance}</p>
            {data.current_user_rank && (
              <p className="text-xs text-muted-foreground">Rank #{data.current_user_rank}</p>
            )}
          </div>
        </div>

        {/* Leaderboard List */}
        {data.leaderboard.length > 0 ? (
          <div className="space-y-2">
            {data.leaderboard.map((entry) => (
              <div
                key={entry.user_id}
                className={`flex items-center justify-between p-3 rounded-lg border ${getRankBg(entry.rank)}`}
              >
                <div className="flex items-center gap-3">
                  {getRankIcon(entry.rank)}
                  <span className="font-medium truncate max-w-[140px]">{entry.user_name}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  {entry.points}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            No leaderboard data yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
