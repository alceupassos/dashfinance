import { ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type FieldType = "text" | "textarea" | "select" | "password"

export interface IntegrationFormField {
  id: string
  label: string
  placeholder?: string
  value?: string
  type?: FieldType
  rows?: number
  options?: Array<{ value: string; label: string }>
  onChange?: (value: string) => void
  disabled?: boolean
  description?: string
}

export interface IntegrationFormProps {
  title?: string
  description?: string
  fields: IntegrationFormField[]
  footer?: ReactNode
  className?: string
}

export function IntegrationForm({ title, description, fields, footer, className }: IntegrationFormProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {title && (
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label}</Label>
            {renderField(field)}
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
          </div>
        ))}
      </div>

      {footer && <div className="pt-2">{footer}</div>}
    </div>
  )
}

function renderField(field: IntegrationFormField) {
  const type = field.type ?? "text"
  const commonProps = {
    id: field.id,
    value: field.value ?? "",
    placeholder: field.placeholder,
    disabled: field.disabled,
  }

  if (type === "textarea") {
    return (
      <Textarea
        {...commonProps}
        rows={field.rows ?? 4}
        onChange={(event) => field.onChange?.(event.target.value)}
      />
    )
  }

  if (type === "select") {
    return (
      <Select value={field.value} onValueChange={(value) => field.onChange?.(value)}>
        <SelectTrigger id={field.id}>
          <SelectValue placeholder={field.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Input
      {...commonProps}
      type={type === "password" ? "password" : "text"}
      onChange={(event) => field.onChange?.(event.target.value)}
    />
  )
}

export default IntegrationForm
