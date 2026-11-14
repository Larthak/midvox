"use client"

import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type SelectContextValue = {
  value: string
  onValueChange: (value: string) => void
  choose: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  setOpen: (open: boolean) => void
  popoverId: string
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  children?: React.ReactNode
  value: string
  onValueChange: (value: string) => void
  // Legacy props compatibility
  options?: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

const Select = ({ children, value, onValueChange, options, placeholder, className, disabled }: SelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const popoverId = React.useId()

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  React.useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      setIsOpen(false)
      containerRef.current
        ?.querySelector<HTMLButtonElement>("button[aria-haspopup]")
        ?.focus()
    }

    // Only one dropdown or popover should be open at a time across the page.
    const handleOtherPopover = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== popoverId) {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    window.addEventListener("midvox:popover-open", handleOtherPopover)
    return () => {
      document.removeEventListener("keydown", handleEscape)
      window.removeEventListener("midvox:popover-open", handleOtherPopover)
    }
  }, [isOpen, popoverId])

  const setOpen = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      window.dispatchEvent(
        new CustomEvent("midvox:popover-open", { detail: popoverId }),
      )
    }
  }

  const choose = (nextValue: string) => {
    onValueChange(nextValue)
    setIsOpen(false)
    window.requestAnimationFrame(() => {
      containerRef.current
        ?.querySelector<HTMLButtonElement>("button[aria-haspopup]")
        ?.focus()
    })
  }

  // If options are provided, use the legacy rendering
  if (options) {
    const selectedOption = options.find((opt) => opt.value === value)
    return (
      <div className={cn("relative w-full", className)} ref={containerRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={`${popoverId}-listbox`}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--ink)] shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50",
            isOpen && "border-primary/50 ring-2 ring-primary/15"
          )}
        >
          <span className={cn("truncate", !selectedOption && "text-neutral-500")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-neutral-500 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div
            id={`${popoverId}-listbox`}
            role="listbox"
            aria-label={placeholder || "Options"}
            className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[0_16px_36px_rgba(25,27,20,0.12)] animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="max-h-60 overflow-y-auto overflow-x-hidden no-scrollbar">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => choose(option.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[var(--ink)] transition-colors hover:bg-primary/10",
                    value === option.value ? "bg-primary/15 text-primary-dark" : ""
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {value === option.value && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Otherwise, use the sub-component pattern
  return (
    <SelectContext.Provider
      value={{ value, onValueChange, choose, isOpen, setIsOpen, setOpen, popoverId }}
    >
      <div className={cn("relative w-full", className)} ref={containerRef}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  if (!context) return null

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => context.setOpen(!context.isOpen)}
      aria-haspopup="listbox"
      aria-expanded={context.isOpen}
      aria-controls={`${context.popoverId}-listbox`}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--ink)] shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50",
        context.isOpen && "border-primary/50 ring-2 ring-primary/15",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 text-neutral-500 transition-transform duration-200", context.isOpen && "rotate-180")} />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder, className }: { placeholder?: string, className?: string }) => {
  const context = React.useContext(SelectContext)
  if (!context) return null
  return <span className={cn("truncate", !context.value && "text-neutral-500", className)}>{context.value || placeholder}</span>
}

const SelectContent = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const context = React.useContext(SelectContext)
  if (!context || !context.isOpen) return null

  return (
    <div
      id={`${context.popoverId}-listbox`}
      role="listbox"
      className={cn("absolute top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[0_16px_36px_rgba(25,27,20,0.12)] animate-in fade-in zoom-in-95 duration-200", className)}
    >
      <div className="max-h-60 overflow-y-auto overflow-x-hidden no-scrollbar">
        {children}
      </div>
    </div>
  )
}

const SelectItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, children, value, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  if (!context) return null

  const isSelected = context.value === value

  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() => context.choose(value)}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[var(--ink)] transition-colors hover:bg-primary/10",
        isSelected ? "bg-primary/15 text-primary-dark" : "",
        className
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {isSelected && <Check className="h-4 w-4" />}
    </button>
  )
})
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
