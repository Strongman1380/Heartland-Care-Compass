import React from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Header } from "@/components/layout/Header"

// Parent route that hosts the School sidebar and nested pages.
const School: React.FC = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <Header />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 pb-24 lg:pb-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default School
