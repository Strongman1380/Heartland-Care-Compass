import React from "react";
import { Header } from "@/components/layout/Header";
import { Link, NavLink, Outlet } from "react-router-dom";
import { GraduationCap, BarChart3, FileSpreadsheet, AlertTriangle, Printer } from "lucide-react";

export default function SchoolLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Left Sidebar */}
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="bg-white border rounded-lg shadow-sm p-2 md:p-3">
              <div className="px-2 py-2 text-xs font-semibold text-slate-500 uppercase">
                School
              </div>
              <nav className="flex flex-col gap-1">
                <NavLink
                  to="/school/scores"
                  className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-red-50 text-red-700' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Scores</span>
                </NavLink>
                <NavLink
                  to="/school/dashboard"
                  className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-red-50 text-red-700' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Academic Progress</span>
                </NavLink>
                <NavLink
                  to="/school/incidents"
                  className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-red-50 text-red-700' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>School Incident Reports</span>
                </NavLink>
                <NavLink
                  to="/school/print-reports"
                  className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-red-50 text-red-700' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Reports</span>
                </NavLink>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <section className="col-span-12 md:col-span-9 lg:col-span-10">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}