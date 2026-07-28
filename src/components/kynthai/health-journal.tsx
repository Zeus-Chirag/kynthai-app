'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, Plus, Save, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { logger } from '@/lib/logger'

interface JournalEntry {
  id: string
  date: string
  symptoms: { name: string; severity: number; notes?: string }[]
  mood: string
  notes: string
  vitals: { bp?: string; sugar?: number; weight?: number; temperature?: number }
}

const MOOD_OPTIONS = [
  { value: 'great', label: 'Great', emoji: '😊' },
  { value: 'good', label: 'Good', emoji: '🙂' },
  { value: 'okay', label: 'Okay', emoji: '😐' },
  { value: 'bad', label: 'Bad', emoji: '😔' },
  { value: 'terrible', label: 'Terrible', emoji: '😢' },
]

const COMMON_SYMPTOMS = [
  'Headache', 'Fever', 'Fatigue', 'Nausea', 'Dizziness',
  'Chest Pain', 'Shortness of Breath', 'Joint Pain', 'Muscle Pain',
  'Stomach Pain', 'Insomnia', 'Anxiety', 'Depression', 'Allergies',
]

export function HealthJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [newEntry, setNewEntry] = useState({
    mood: '',
    symptoms: [] as { name: string; severity: number }[],
    notes: '',
    vitals: { bp: '', sugar: '', weight: '', temperature: '' },
  })

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/health-journal')
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
      }
    } catch (error) {
      logger.warn('Failed to fetch journal entries:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const saveEntry = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch('/api/health-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          mood: newEntry.mood,
          symptoms: newEntry.symptoms,
          notes: newEntry.notes,
          vitals: {
            bp: newEntry.vitals.bp || undefined,
            sugar: newEntry.vitals.sugar ? Number(newEntry.vitals.sugar) : undefined,
            weight: newEntry.vitals.weight ? Number(newEntry.vitals.weight) : undefined,
            temperature: newEntry.vitals.temperature ? Number(newEntry.vitals.temperature) : undefined,
          },
        }),
      })

      if (res.ok) {
        setShowNewEntry(false)
        setNewEntry({ mood: '', symptoms: [], notes: '', vitals: { bp: '', sugar: '', weight: '', temperature: '' } })
        fetchEntries()
      }
    } catch (error) {
      logger.warn('Failed to save journal entry:', error)
    }
  }

  const addSymptom = (name: string) => {
    if (!newEntry.symptoms.find(s => s.name === name)) {
      setNewEntry({
        ...newEntry,
        symptoms: [...newEntry.symptoms, { name, severity: 5 }],
      })
    }
  }

  const removeSymptom = (name: string) => {
    setNewEntry({
      ...newEntry,
      symptoms: newEntry.symptoms.filter(s => s.name !== name),
    })
  }

  const updateSymptomSeverity = (name: string, severity: number) => {
    setNewEntry({
      ...newEntry,
      symptoms: newEntry.symptoms.map(s => s.name === name ? { ...s, severity } : s),
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Health Journal
          </CardTitle>
          <Button size="sm" onClick={() => setShowNewEntry(!showNewEntry)}>
            <Plus className="h-4 w-4 mr-1" />
            New Entry
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Entry Form */}
        {showNewEntry && (
          <div className="p-4 border rounded-lg space-y-4">
            {/* Mood Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">How are you feeling?</label>
              <div className="flex gap-2">
                {MOOD_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={newEntry.mood === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewEntry({ ...newEntry, mood: option.value })}
                  >
                    <span className="mr-1">{option.emoji}</span>
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Symptoms */}
            <div>
              <label className="text-sm font-medium mb-2 block">Symptoms</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COMMON_SYMPTOMS.map((symptom) => (
                  <Button
                    key={symptom}
                    variant={newEntry.symptoms.find(s => s.name === symptom) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => addSymptom(symptom)}
                  >
                    {symptom}
                  </Button>
                ))}
              </div>
              {newEntry.symptoms.length > 0 && (
                <div className="space-y-2 mt-2">
                  {newEntry.symptoms.map((symptom) => (
                    <div key={symptom.name} className="flex items-center gap-2">
                      <Badge variant="secondary">{symptom.name}</Badge>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={symptom.severity}
                        onChange={(e) => updateSymptomSeverity(symptom.name, Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-8">{symptom.severity}/10</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSymptom(symptom.name)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vitals */}
            <div>
              <label className="text-sm font-medium mb-2 block">Vitals (Optional)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Blood Pressure</label>
                  <input
                    type="text"
                    placeholder="120/80"
                    value={newEntry.vitals.bp}
                    onChange={(e) => setNewEntry({ ...newEntry, vitals: { ...newEntry.vitals, bp: e.target.value } })}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Blood Sugar (mg/dL)</label>
                  <input
                    type="number"
                    placeholder="95"
                    value={newEntry.vitals.sugar}
                    onChange={(e) => setNewEntry({ ...newEntry, vitals: { ...newEntry.vitals, sugar: e.target.value } })}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Weight (kg)</label>
                  <input
                    type="number"
                    placeholder="70"
                    value={newEntry.vitals.weight}
                    onChange={(e) => setNewEntry({ ...newEntry, vitals: { ...newEntry.vitals, weight: e.target.value } })}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Temperature (°F)</label>
                  <input
                    type="number"
                    placeholder="98.6"
                    value={newEntry.vitals.temperature}
                    onChange={(e) => setNewEntry({ ...newEntry, vitals: { ...newEntry.vitals, temperature: e.target.value } })}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                placeholder="How was your day? Any observations about your health..."
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Save Button */}
            <Button onClick={saveEntry} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Entry
            </Button>
          </div>
        )}

        {/* Journal Entries */}
        <div className="space-y-3">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <JournalEntryCard key={entry.id} entry={entry} />
            ))
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No journal entries yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start tracking your daily health to see trends!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function JournalEntryCard({ entry }: { entry: JournalEntry }) {
  const moodEmoji = MOOD_OPTIONS.find(m => m.value === entry.mood)?.emoji || '😐'
  const date = new Date(entry.date)
  const isToday = date.toDateString() === new Date().toDateString()

  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{moodEmoji}</span>
          <span className="font-medium">
            {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
        {entry.symptoms.length > 0 && (
          <Badge variant="secondary">{entry.symptoms.length} symptoms</Badge>
        )}
      </div>

      {entry.symptoms.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {entry.symptoms.map((symptom) => (
            <Badge key={symptom.name} variant="outline" className="text-xs">
              {symptom.name} ({symptom.severity}/10)
            </Badge>
          ))}
        </div>
      )}

      {entry.vitals && (
        <div className="flex gap-3 text-sm text-muted-foreground mb-2">
          {entry.vitals.bp && <span>BP: {entry.vitals.bp}</span>}
          {entry.vitals.sugar && <span>Sugar: {entry.vitals.sugar}</span>}
          {entry.vitals.weight && <span>Weight: {entry.vitals.weight}kg</span>}
          {entry.vitals.temperature && <span>Temp: {entry.vitals.temperature}°F</span>}
        </div>
      )}

      {entry.notes && (
        <p className="text-sm text-muted-foreground">{entry.notes}</p>
      )}
    </div>
  )
}
