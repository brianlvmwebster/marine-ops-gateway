"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import styles from "./MapToolProgress.module.css"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    value={value ?? null}
    className={`${styles.progress} ${className ?? ""}`}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={styles.indicator}
      style={value == null ? undefined : { transform: `translateX(-${100 - value}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }