import { Header } from "@/components/layout/Header"
import { DataMigration } from "@/components/migration/DataMigration"

const DataMigrationPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Data Migration
          </h1>
          <p className="text-red-700 text-base sm:text-lg">Migrate your local data to Supabase cloud database</p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <DataMigration />
        </div>
      </main>
    </div>
  )
}

export default DataMigrationPage