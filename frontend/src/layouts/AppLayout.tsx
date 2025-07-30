// src/layouts/AppLayout.tsx
import React from "react";
// import { useLocation } from "react-router-dom";
import Header from "../components/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // const location = useLocation();
  // const isAuthPage = ["/login", "/setup"].includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 bg-white">{children}</main>
              <footer className="bg-gray-100 text-center p-4 text-sm text-gray-500">
          © {new Date().getFullYear()} LimoApp. All rights reserved.
        </footer>
      
    </div>
  );
}
