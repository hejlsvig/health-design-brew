import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-serif font-bold text-accent/30 mb-4">404</p>
        <h1 className="font-serif text-2xl font-bold text-foreground mb-3">
          Siden blev ikke fundet
        </h1>
        <p className="text-muted-foreground mb-8">
          Siden du leder efter eksisterer ikke eller er blevet flyttet.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            Gå til forsiden
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Gå tilbage
          </button>
        </div>
      </div>
    </div>
  )
}
