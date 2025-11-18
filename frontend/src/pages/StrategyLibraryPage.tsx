/**
 * Strategy Library page
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

const StrategyLibraryPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Strategy Library</h1>
        <p className="text-text-secondary">Browse and manage your trading strategies</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Strategies</CardTitle>
          <CardDescription>Coming soon - Strategy library functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-text-secondary">Strategy library will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StrategyLibraryPage;

