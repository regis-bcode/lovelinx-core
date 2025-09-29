import * as React from "react"
import { cn } from "@/lib/utils"

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string | number
  onChange?: (value: string) => void
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('')

    React.useEffect(() => {
      if (value !== undefined) {
        const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : Number(value)
        if (!isNaN(numericValue)) {
          setDisplayValue(formatCurrency(numericValue))
        } else {
          setDisplayValue('')
        }
      } else {
        setDisplayValue('')
      }
    }, [value])


    const formatCurrency = (value: number): string => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
      }).format(value)
    }

    const parseCurrency = (value: string): string => {
      // Remove tudo exceto números e vírgulas/pontos
      const numericValue = value.replace(/[^\d,.]/g, '')
        .replace(/\./g, '') // Remove pontos de milhares
        .replace(',', '.') // Converte vírgula decimal para ponto
      return numericValue || '0'
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const numericValue = parseCurrency(inputValue)
      const floatValue = parseFloat(numericValue)
      
      // Aceita valores até 999.999.999,99
      if (!isNaN(floatValue) && floatValue <= 999999999.99) {
        const formatted = formatCurrency(floatValue)
        setDisplayValue(formatted)
        onChange?.(numericValue)
      } else if (isNaN(floatValue)) {
        setDisplayValue('')
        onChange?.('0')
      } else {
        // Se valor é muito alto, mantém o valor anterior
        return
      }
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
        ref={ref}
        {...props}
      />
    )
  }
)
CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }