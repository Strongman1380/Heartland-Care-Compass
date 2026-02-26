import React from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from "@/components/layout/Header"

// Parent route for all school sub-pages.
// Use the same full-width container layout as the rest of the app.
const School: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        <Outlet />
      </main>
    </div>
  )
}

export default School
