import { normalizeNumericValue } from "@/lib/tariff-csv"

const ALLOWED_FUNCTIONS = new Set(["MIN", "MAX", "ROUND", "ABS"])

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: string }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma" }

function tokenize(formula: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < formula.length) {
    const ch = formula[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (/[0-9.,]/.test(ch)) {
      let raw = ch
      i++
      while (i < formula.length && /[0-9.,]/.test(formula[i])) {
        raw += formula[i]
        i++
      }
      const num = normalizeNumericValue(raw)
      if (num === null) throw new Error(`Nombre invalide : ${raw}`)
      tokens.push({ type: "number", value: num })
      continue
    }
    if (/[a-zA-Z_][a-zA-Z0-9_]*/.test(ch)) {
      let raw = ch
      i++
      while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) {
        raw += formula[i]
        i++
      }
      tokens.push({ type: "identifier", value: raw })
      continue
    }
    if ("+-*/".includes(ch)) {
      tokens.push({ type: "operator", value: ch })
      i++
      continue
    }
    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch })
      i++
      continue
    }
    if (ch === ",") {
      tokens.push({ type: "comma" })
      i++
      continue
    }
    throw new Error(`Caractère non autorisé : ${ch}`)
  }
  return tokens
}

function extractIdentifiers(tokens: Token[]): string[] {
  const ids: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type !== "identifier") continue
    const next = tokens[i + 1]
    if (next?.type === "paren" && next.value === "(") {
      if (!ALLOWED_FUNCTIONS.has(token.value.toUpperCase())) {
        throw new Error(`Fonction non autorisée : ${token.value}`)
      }
      continue
    }
    ids.push(token.value)
  }
  return ids
}

export function validateFormula(formula: string, allowedColumns: string[]): { valid: boolean; error?: string } {
  const trimmed = formula.trim()
  if (!trimmed) return { valid: false, error: "La formule est vide" }
  try {
    const tokens = tokenize(trimmed)
    const identifiers = extractIdentifiers(tokens)
    const allowed = new Set(allowedColumns)
    for (const id of identifiers) {
      if (!allowed.has(id)) {
        return { valid: false, error: `Colonne inconnue : ${id}` }
      }
    }
    evaluateFormula(trimmed, Object.fromEntries(allowedColumns.map((c) => [c, 1])))
    return { valid: true }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Formule invalide" }
  }
}

class Parser {
  private pos = 0

  constructor(private tokens: Token[], private vars: Record<string, number>) {}

  parse(): number {
    const value = this.parseExpression()
    if (this.pos < this.tokens.length) {
      throw new Error("Formule incomplète")
    }
    return value
  }

  private parseExpression(): number {
    let value = this.parseTerm()
    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos]
      if (token.type !== "operator" || (token.value !== "+" && token.value !== "-")) break
      this.pos++
      const right = this.parseTerm()
      value = token.value === "+" ? value + right : value - right
    }
    return value
  }

  private parseTerm(): number {
    let value = this.parseFactor()
    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos]
      if (token.type !== "operator" || (token.value !== "*" && token.value !== "/")) break
      this.pos++
      const right = this.parseFactor()
      if (token.value === "/" && right === 0) throw new Error("Division par zéro")
      value = token.value === "*" ? value * right : value / right
    }
    return value
  }

  private parseFactor(): number {
    const token = this.tokens[this.pos]
    if (!token) throw new Error("Formule incomplète")

    if (token.type === "operator" && token.value === "-") {
      this.pos++
      return -this.parseFactor()
    }
    if (token.type === "operator" && token.value === "+") {
      this.pos++
      return this.parseFactor()
    }
    if (token.type === "number") {
      this.pos++
      return token.value
    }
    if (token.type === "identifier") {
      const name = token.value
      const next = this.tokens[this.pos + 1]
      if (next?.type === "paren" && next.value === "(") {
        return this.parseFunction(name)
      }
      this.pos++
      if (!(name in this.vars)) throw new Error(`Variable inconnue : ${name}`)
      return this.vars[name]
    }
    if (token.type === "paren" && token.value === "(") {
      this.pos++
      const value = this.parseExpression()
      const closing = this.tokens[this.pos]
      if (!closing || closing.type !== "paren" || closing.value !== ")") {
        throw new Error("Parenthèse fermante manquante")
      }
      this.pos++
      return value
    }
    throw new Error("Expression invalide")
  }

  private parseFunction(name: string): number {
    this.pos += 2
    const args: number[] = []
    const closingParen = this.tokens[this.pos]
    if (closingParen?.type === "paren" && closingParen.value === ")") {
      this.pos++
      throw new Error(`La fonction ${name} nécessite des arguments`)
    }
    while (this.pos < this.tokens.length) {
      args.push(this.parseExpression())
      const token = this.tokens[this.pos]
      if (token?.type === "comma") {
        this.pos++
        continue
      }
      if (token?.type === "paren" && token.value === ")") {
        this.pos++
        break
      }
      throw new Error(`Arguments invalides pour ${name}`)
    }

    const upper = name.toUpperCase()
    if (upper === "MIN") return Math.min(...args)
    if (upper === "MAX") return Math.max(...args)
    if (upper === "ABS") return Math.abs(args[0] ?? 0)
    if (upper === "ROUND") {
      const value = args[0] ?? 0
      const digits = args[1] ?? 0
      const factor = 10 ** digits
      return Math.round(value * factor) / factor
    }
    throw new Error(`Fonction non autorisée : ${name}`)
  }
}

export function evaluateFormula(formula: string, vars: Record<string, number>): number {
  const tokens = tokenize(formula.trim())
  return new Parser(tokens, vars).parse()
}
