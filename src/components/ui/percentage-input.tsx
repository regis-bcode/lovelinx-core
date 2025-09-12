import * as React from "react"
import { cn } from "@/lib/utils"

export interface PercentageInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string | number
  onChange?: (value: string) => void
}

const PercentageInput = React.forwardRef<HTMLInputElement, PercentageInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('')

    React.useEffect(() => {
      if (value !== undefined) {
        const numericValue = typeof value === 'string' ? parseFloat(value) : value
        if (!isNaN(numericValue) && numericValue !== 0) {
          setDisplayValue(numericValue.toString())
        } else {
          setDisplayValue('')
        }
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value.replace('%', '').replace(',', '.')
      const numericValue = parseFloat(inputValue)
      
      if (!isNaN(numericValue)) {
        setDisplayValue(inputValue)
        onChange?.(numericValue.toString())
      } else {
        setDisplayValue('')
        onChange?.('0')
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (displayValue && !displayValue.includes('%')) {
        const numericValue = parseFloat(displayValue)
        if (!isNaN(numericValue)) {
          setDisplayValue(numericValue + '%')
        }
      }
      props.onBlur?.(e)
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (displayValue.includes('%')) {
        setDisplayValue(displayValue.replace('%', ''))
      }
      props.onFocus?.(e)
    }

    return (
      <input
        type="text"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        ref={ref}
        {...props}
      />
    )
  }
)
PercentageInput.displayName = "PercentageInput"

export { PercentageInput }