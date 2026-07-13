/**
 * Barrel exports for @/components
 */

export { StructuredData, usePageStructuredData } from "./structured-data";

export { useWebVitals, type WebVitalMetric, type MetricName, type WebVitalsOptions } from "./web-vitals";

export { ErrorBoundary, ErrorProvider, useErrorBoundary } from "./error-boundary";
export type { ErrorBoundaryProps, ErrorProviderProps } from "./error-boundary";

// Performance wrapper
export {
  usePerformanceOptimisations,
  PreconnectProvider,
  LazyLoader,
} from "./performance-wrapper";
export type {
  Priority,
  LazyComponentConfig,
  PerformanceOptions,
} from "./performance-wrapper";

// Re-export named props of LazyLoader so barrel consumers keep working
import type { LazyLoader } from "./performance-wrapper";
// LazyLoader props shape — consumers who import this type still work
export type LazyLoadProps = Parameters<typeof LazyLoader>[0];
