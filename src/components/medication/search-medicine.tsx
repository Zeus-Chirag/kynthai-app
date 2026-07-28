'use client'

import { useState } from 'react'
import {
  Search,
  Loader2,
  ExternalLink,
  Globe,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { MedicalDisclaimer } from '@/components/kynthai/medical-disclaimer'

interface SearchResult {
  url: string
  name: string
  snippet: string
  host_name: string
  date?: string
  favicon?: string
}

const QUICK_QUERIES = [
  'Paracetamol side effects',
  'Amoxicillin uses',
  'Ibuprofen dosage',
  'Metformin interactions',
]

export function SearchMedicine() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const { toast } = useToast()

  const search = async (q?: string) => {
    const term = (q ?? query).trim()
    if (!term) {
      toast({ title: 'Enter a search term', variant: 'destructive' })
      return
    }
    setLoading(true)
    setSearched(true)
    if (q) setQuery(q)
    try {
      const res = await fetch(`/api/search-medicine?q=${encodeURIComponent(term)}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data.results || [])
    } catch (e) {
      toast({
        title: 'Search failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Globe className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-primary">Medicine Web Search</p>
            <p className="text-muted-foreground text-xs mt-1">
              Look up real-time information about medicines — uses, side effects,
              dosage, interactions and recent news from trusted web sources.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a medicine or symptom..."
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === 'Enter') search()
            }}
          />
        </div>
        <Button onClick={() => search()} disabled={loading} className="bg-primary">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className="ml-1 hidden sm:inline">Search</span>
        </Button>
      </div>

      {/* Quick queries */}
      {!searched && (
        <div className="flex flex-wrap gap-2">
          {QUICK_QUERIES.map((q) => (
            <Button
              key={q}
              size="sm"
              variant="outline"
              className="text-xs h-auto py-1.5"
              onClick={() => search(q)}
            >
              {q}
            </Button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : searched && results.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No results found</p>
            <p className="text-sm mt-1">Try a different search term.</p>
          </CardContent>
        </Card>
      ) : results.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground">
            Showing {results.length} results for &ldquo;{query}&rdquo;
          </p>
          <ScrollArea className="max-h-[36rem]">
            <div className="space-y-3 pr-2">
              {results.map((r, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {r.favicon ? (
                          <img
                            src={r.favicon}
                            alt=""
                            className="h-4 w-4 rounded-sm"
                          />
                        ) : (
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground truncate">
                          {r.host_name}
                        </span>
                        {r.date && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 ml-auto flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {r.date}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-primary group-hover:underline flex items-start gap-1.5">
                        {r.name}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition" />
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {r.snippet}
                      </p>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </>
      ) : null}

      {results.length > 0 && <MedicalDisclaimer compact />}
    </div>
  )
}
