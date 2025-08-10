"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

type Theme = "light" | "dark"

function getPreferredTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme") as Theme | null
    if (stored === "light" || stored === "dark") return stored
  } catch {}
  return "dark"
}

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>("light")

  React.useEffect(() => {
    const initial = getPreferredTheme()
    setTheme(initial)
    document.documentElement.classList.toggle("dark", initial === "dark")
  }, [])

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark"
    setTheme(next)
    try {
      localStorage.setItem("theme", next)
    } catch {}
    document.documentElement.classList.toggle("dark", next === "dark")
  }

  const isDark = theme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}

export default ThemeToggle


