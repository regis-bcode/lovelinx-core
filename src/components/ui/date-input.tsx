import * as React from "react"

import { cn } from "@/lib/utils"

export interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string
  onChange?: (value: string) => void
}

const ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/
const DISPLAY_REGEX = /^\d{2}\/\d{2}\/\d{4}$/

const digitsToISO = (digits: string): string | null => {
  if (digits.length !== 8) return null

  const day = Number(digits.slice(0, 2))
  const month = Number(digits.slice(2, 4))
  const year = Number(digits.slice(4))

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return null
  }

  if (month < 1 || month > 12) {
    return null
  }

  const maxDay = new Date(year, month, 0).getDate()
  if (day < 1 || day > maxDay) {
    return null
  }

  return [
    year.toString().padStart(4, "0"),
    month.toString().padStart(2, "0"),
    day.toString().padStart(2, "0"),
  ].join("-")
}

const isoToDisplay = (iso: string): string => {
  if (!ISO_REGEX.test(iso)) return iso
  const [year, month, day] = iso.split("-")
  return `${day}/${month}/${year}`
}

const normalizeIncomingValue = (value?: string): string => {
  if (!value) return ""

  if (ISO_REGEX.test(value)) {
    return isoToDisplay(value)
  }

  if (DISPLAY_REGEX.test(value)) {
    return value
  }

  const digits = value.replace(/\D/g, "")
  if (digits.length === 8) {
    const iso = digitsToISO(digits)
    if (iso) {
      return isoToDisplay(iso)
    }
  }

  return ""
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value, onChange, onBlur, onFocus, placeholder = "dd/mm/aaaa", ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("")
    const [isFocused, setIsFocused] = React.useState(false)

    React.useEffect(() => {
      if (isFocused) return
      setDisplayValue(normalizeIncomingValue(value))
    }, [value, isFocused])

    const emitChange = (nextValue: string) => {
      if (!onChange) return
      onChange(nextValue)
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value
      const digits = raw.replace(/\D/g, "").slice(0, 8)

      if (!digits) {
        setDisplayValue("")
        emitChange("")
        return
      }

      let masked = digits
      if (digits.length > 2) {
        masked = `${digits.slice(0, 2)}/${digits.slice(2)}`
      }
      if (digits.length > 4) {
        masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
      }

      setDisplayValue(masked)

      if (digits.length === 8) {
        const iso = digitsToISO(digits)
        if (iso) {
          emitChange(iso)
        }
      }
    }

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)

      const digits = displayValue.replace(/\D/g, "")
      if (!digits) {
        setDisplayValue("")
        emitChange("")
        onBlur?.(event)
        return
      }

      if (digits.length !== 8) {
        setDisplayValue("")
        emitChange("")
        onBlur?.(event)
        return
      }

      const iso = digitsToISO(digits)
      if (!iso) {
        setDisplayValue("")
        emitChange("")
        onBlur?.(event)
        return
      }

      setDisplayValue(isoToDisplay(iso))
      emitChange(iso)
      onBlur?.(event)
    }

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      onFocus?.(event)
    }

    return (
      <input
        type="text"
        inputMode="numeric"
        maxLength={10}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        ref={ref}
        {...props}
      />
    )
  }
)
DateInput.displayName = "DateInput"

export { DateInput }
