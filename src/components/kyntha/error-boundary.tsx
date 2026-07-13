"use client"

import React from 'react'
import { ErrorBoundary as FullErrorBoundary } from '@/components/error-boundary'

/** Re-export the full error boundary so all portals share one implementation */
export { FullErrorBoundary as ErrorBoundary }
