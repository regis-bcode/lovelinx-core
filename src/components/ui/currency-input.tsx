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
    const [isFocused, setIsFocused] = React.useState(false)

    // Sincroniza valor externo com display
    React.useEffect(() => {
      if (isFocused) return; // Não atualiza enquanto está editando
      
      if (value === '' || value === undefined || value === null) {
        setDisplayValue('')
      } else {
        const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : Number(value)
        if (!isNaN(numericValue) && numericValue !== 0) {
          setDisplayValue(formatCurrency(numericValue))
        } else if (numericValue === 0) {
          setDisplayValue('R$ 0,00')
        } else {
          setDisplayValue('')
        }
      }
    }, [value, isFocused])

    const formatCurrency = (value: number): string => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value)
    }

    const parseCurrency = (value: string): string => {
      // Remove tudo exceto números, vírgulas e pontos
      const cleaned = value.replace(/[^\d,.]/g, '')
        .replace(/\./g, '') // Remove pontos de milhares
        .replace(',', '.') // Converte vírgula decimal para ponto
      return cleaned
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      
      // Permite campo vazio
      if (inputValue.trim() === '') {
        setDisplayValue('')
        onChange?.('')
        return
      }

      // Permite entradas parciais durante digitação (ex: "12", "12.", "12,5")
      setDisplayValue(inputValue)
      
      const numericStr = parseCurrency(inputValue)
      
      // Se não há número válido ainda (ex: apenas "R$"), não chama onChange
      if (numericStr === '') {
        onChange?.('')
        return
      }

      const floatValue = parseFloat(numericStr)
      
      // Valida limite máximo
      if (!isNaN(floatValue) && floatValue <= 999999999.99) {
        onChange?.(numericStr)
      }
    }

    const handleFocus = () => {
      setIsFocused(true)
      // Remove formatação para edição mais fácil
      if (displayValue && displayValue !== '') {
        const numericStr = parseCurrency(displayValue)
        if (numericStr) {
          const floatValue = parseFloat(numericStr)
          if (!isNaN(floatValue)) {
            // Exibe número sem formatação para edição
            setDisplayValue(floatValue.toString().replace('.', ','))
          }
        }
      }
    }

    const handleBlur = () => {
      setIsFocused(false)
      
      // Formata ao sair do campo
      if (displayValue && displayValue.trim() !== '') {
        const numericStr = parseCurrency(displayValue)
        if (numericStr) {
          const floatValue = parseFloat(numericStr)
          if (!isNaN(floatValue)) {
            setDisplayValue(formatCurrency(floatValue))
            onChange?.(numericStr)
          } else {
            setDisplayValue('')
            onChange?.('')
          }
        } else {
          setDisplayValue('')
          onChange?.('')
        }
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
        onFocus={handleFocus}
        onBlur={handleBlur}
        ref={ref}
        {...props}
      />
    )
  }
)
CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }