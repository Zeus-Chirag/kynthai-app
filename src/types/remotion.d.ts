declare module "remotion" {
  import { ReactNode } from "react"
  export const AbsoluteFill: React.FC<{ style?: React.CSSProperties; children?: ReactNode }>
  export const Composition: React.FC<{
    id: string
    component: React.FC<any>
    durationInFrames: number
    fps: number
    width: number
    height: number
  }>
  export function useCurrentFrame(): number
  export function interpolate(
    frame: number,
    input: readonly [number, number] | readonly [number, number, number],
    output: readonly number[]
  ): number
  export const Sequence: React.FC<{ from?: number; children?: ReactNode }>
  export function registerRoot(component: React.FC): void
}