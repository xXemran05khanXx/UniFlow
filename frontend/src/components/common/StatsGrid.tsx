import React from 'react';
import { LucideIcon } from 'lucide-react';
import Card from '../ui/Card';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  change,
  changeType = 'neutral'
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm font-medium ${getChangeColor()}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`${color} p-3 rounded-full`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </Card>
  );
};

interface StatsGridProps {
  stats: Array<{
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
  }>;
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  );
};

export { StatsCard, StatsGrid };
