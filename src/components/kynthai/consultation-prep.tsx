'use client'

import { useLayoutEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, Calendar, Pill, AlertTriangle, MessageSquare, ClipboardList } from 'lucide-react'
import { logger } from '@/lib/logger'

interface ConsultationData {
  patientName: string
  visitDate: string
  medications: { name: string; dosage: string; frequency: string }[]
  adherence: { totalDoses: number; taken: number; percentage: number }
  symptoms: { date: string; symptoms: string[]; severity: number }[]
  questions: string[]
  allergies: string[]
  conditions: string[]
  labResults?: { test: string; value: string; status: string }[]
}

export function ConsultationPrep() {
  const [data, setData] = useState<ConsultationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const fetchConsultationData = async () => {
    try {
      const res = await fetch('/api/consultation-prep')
      if (res.ok) {
        const prepData = await res.json()
        setData(prepData)
      }
    } catch (error) {
      logger.warn('Failed to fetch consultation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/consultation-prep', { method: 'POST' })
      if (res.ok) {
        const report = await res.json()
        setData(report)
      }
    } catch (error) {
      logger.warn('Failed to generate report:', error)
    } finally {
      setGenerating(false)
    }
  }

  const exportToPDF = async () => {
    // PDF export via browser print dialog
  }

  useLayoutEffect(() => {
    fetchConsultationData()
  }, [])

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
            <ClipboardList className="h-5 w-5" />
            Doctor Visit Prep
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
            <Button size="sm" onClick={generateReport} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {data ? (
          <>
            {/* Patient Info */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">Patient Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{' '}
                  <span className="font-medium">{data.patientName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Visit Date:</span>{' '}
                  <span className="font-medium">
                    {data.visitDate ? new Date(data.visitDate).toLocaleDateString('en-US') : 'Not scheduled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Medications */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Current Medications ({data.medications.length})
              </h3>
              <div className="space-y-2">
                {data.medications.map((med, i) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{med.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">{med.dosage}</span>
                    </div>
                    <Badge variant="outline">{med.frequency}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Adherence Summary */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Medication Adherence
              </h3>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span>Adherence Rate</span>
                  <span className="font-bold text-lg">{data.adherence.percentage}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      data.adherence.percentage >= 80 ? 'bg-green-500' :
                      data.adherence.percentage >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${data.adherence.percentage}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {data.adherence.taken} of {data.adherence.totalDoses} doses taken
                </p>
              </div>
            </div>

            {/* Recent Symptoms */}
            {data.symptoms.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Recent Symptoms
                </h3>
                <div className="space-y-2">
                  {data.symptoms.slice(0, 5).map((entry, i) => (
                    <div key={i} className="p-2 border rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString('en-US')}
                        </span>
                        <Badge variant="outline">Severity: {entry.severity}/10</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.symptoms.map((symptom, j) => (
                          <Badge key={j} variant="secondary" className="text-xs">
                            {symptom}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Allergies & Conditions */}
            <div className="grid grid-cols-2 gap-4">
              {data.allergies.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Allergies</h3>
                  <div className="flex flex-wrap gap-1">
                    {data.allergies.map((allergy, i) => (
                      <Badge key={i} variant="destructive">{allergy}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {data.conditions.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Conditions</h3>
                  <div className="flex flex-wrap gap-1">
                    {data.conditions.map((condition, i) => (
                      <Badge key={i} variant="secondary">{condition}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Questions for Doctor */}
            {data.questions.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Questions for Your Doctor
                </h3>
                <div className="space-y-2">
                  {data.questions.map((question, i) => (
                    <div key={i} className="p-2 border rounded flex items-start gap-2">
                      <span className="text-primary font-medium">Q{i + 1}</span>
                      <span className="text-sm">{question}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No consultation data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start tracking your health to generate a doctor visit report
            </p>
            <Button className="mt-4" onClick={generateReport} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
