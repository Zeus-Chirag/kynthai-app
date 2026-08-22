"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const trackW = isMobile ? 40 : 44
  const trackH = isMobile ? 22 : 24
  const thumbSize = isMobile ? 18 : 20

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors outline-none",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        "dark:data-[state=unchecked]:bg-input/80",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{
        width: trackW,
        height: trackH,
      }}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-white shadow-sm ring-0 transition-transform dark:bg-foreground"
        style={{
          width: thumbSize,
          height: thumbSize,
          transform: props.checked ? `translateX(${trackW - thumbSize - 2}px)` : 'translateX(2px)',
        }}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
