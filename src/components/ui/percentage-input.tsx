import * as React from "react"

import { cn } from "@/lib/utils"

export interface PercentageInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string | number
  onChange?: (value: string) => void
}

const clampPercentage = (value: number) => Math.min(Math.max(value, 0), 100)

const formatPercentage = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value)
}

const normalizeValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return null
  }

  if (typeof value === "number") {
    if (Number.isNaN(value)) return null
    return clampPercentage(value)
  }

  const parsed = parseFloat(String(value).replace(",", "."))
  if (Number.isNaN(parsed)) return null
  return clampPercentage(parsed)
}

const PercentageInput = React.forwardRef<HTMLInputElement, PercentageInputProps>(
  ({ className, value, onChange, onBlur, onFocus, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("")
    const [isFocused, setIsFocused] = React.useState(false)

    React.useEffect(() => {
      if (isFocused) {
        return
      }

      const normalized = normalizeValue(value)
      if (normalized === null) {
        setDisplayValue("")
        return
      }

      setDisplayValue(`${formatPercentage(normalized)}%`)
    }, [value, isFocused])

    const emitChange = (nextValue: string) => {
      if (!onChange) return
      onChange(nextValue)
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value

      const digitsOnly = rawValue
        .replace(/[^0-9,]/g, "")
        .replace(/^0+(?=\d)/, "0")

      if (digitsOnly === "") {
        setDisplayValue("")
        emitChange("")
        return
      }

      const [integerPartRaw, decimalPartRaw = ""] = digitsOnly.split(",")
      const integerPart = integerPartRaw.slice(0, 3)
      const decimalPart = decimalPartRaw.slice(0, 2)

      let composed = integerPart
      if (decimalPart) {
        composed = `${integerPart},${decimalPart}`
      }

      const numericValue = parseFloat(composed.replace(",", "."))
      if (Number.isNaN(numericValue)) {
        setDisplayValue(composed)
        emitChange("")
        return
      }

      const clamped = clampPercentage(numericValue)

      let finalDisplay: string
      let finalValue: number

      if (clamped === 100) {
        finalDisplay = "100"
        finalValue = 100
      } else if (decimalPart) {
        const decimalLength = Math.min(decimalPart.length, 2)
        finalValue = Number(clamped.toFixed(decimalLength))
        finalDisplay = finalValue.toString().replace(".", ",")
      } else {
        finalValue = Number(clamped.toFixed(0))
        finalDisplay = finalValue.toString()
      }

      setDisplayValue(finalDisplay)
      emitChange(finalValue.toString())
    }

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      if (displayValue.endsWith("%")) {
        setDisplayValue(displayValue.slice(0, -1))
      }
      onFocus?.(event)
    }

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)

      if (!displayValue.trim()) {
        setDisplayValue("")
        emitChange("")
        onBlur?.(event)
        return
      }

      const normalized = normalizeValue(displayValue)
      if (normalized === null) {
        setDisplayValue("")
        emitChange("")
        onBlur?.(event)
        return
      }

      const formatted = formatPercentage(normalized)
      setDisplayValue(`${formatted}%`)
      emitChange(normalized.toString())
      onBlur?.(event)
    }

    return (
      <input
        type="text"
        inputMode="decimal"
        maxLength={6}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        ref={ref}
        {...props}
      />
    )
  }
)
PercentageInput.displayName = "PercentageInput"

export { PercentageInput }
