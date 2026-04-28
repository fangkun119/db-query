import React from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">DB Query Tool</h1>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="text-gray-400 text-sm">
            Database List (placeholder)
          </div>
        </div>
        <div className="p-4 border-t border-gray-700">
          <div className="text-gray-400 text-sm">
            Schema Tree (placeholder)
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
