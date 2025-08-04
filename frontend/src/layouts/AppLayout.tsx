// src/layouts/AppLayout.tsx
import Header from '../components/Header'

import { Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 bg-white">
        <Outlet />
      </main>
      <footer className="bg-gray-100 text-center p-4 text-sm text-gray-500">
        © {new Date().getFullYear()} LimoApp. All rights reserved.
      </footer>
    </div>
  );
}
