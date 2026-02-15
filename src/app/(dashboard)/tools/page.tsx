"use client"

import { useState } from "react"
import { smsService } from "@/services"
import type { SMSAnalysis, NonGSMCharacter } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, MessageSquare, AlertTriangle, Lightbulb } from "lucide-react"

export default function ToolsPage() {
  const [message, setMessage] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<SMSAnalysis | null>(null)
  const [specialChars, setSpecialChars] = useState<NonGSMCharacter[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])

  const analyzeMessage = async () => {
    if (!message.trim()) return

    setIsAnalyzing(true)
    try {
      const [analysisResult, optimizeResult, specialResult] = await Promise.all([
        smsService.analyzeMessage(message),
        smsService.optimizeMessage(message),
        smsService.findSpecialChars(message),
      ])
      setAnalysis(analysisResult)
      setSuggestions(optimizeResult.suggestions)
      setSpecialChars(specialResult.non_gsm_characters)
    } catch (error) {
    } finally {
      setIsAnalyzing(false)
    }
  }

  const highlightSpecialChars = (text: string, chars: NonGSMCharacter[]) => {
    if (chars.length === 0) return text

    const positions = new Set(chars.map((c) => c.position))
    return text.split("").map((char, index) => {
      if (positions.has(index)) {
        return (
          <span
            key={index}
            className="rounded bg-amber-200/80 px-0.5 text-foreground dark:bg-amber-800/60"
          >
            {char}
          </span>
        )
      }
      return char
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SMS Tools</h1>
          <p className="text-muted-foreground mt-1">
            Analysez et optimisez vos messages SMS.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle>Message</CardTitle>
            <CardDescription>
              Entrez votre message pour l&apos;analyser
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Tapez votre message ici..."
              className="min-h-[200px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {message.length} caractères
              </span>
              <Button onClick={analyzeMessage} disabled={!message.trim() || isAnalyzing}>
                {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {/* Analysis */}
          {analysis && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  <CardTitle>Analyse</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border/60 bg-card p-4 shadow-[var(--shadow-xs)]">
                    <p className="text-3xl font-bold">{analysis.segments}</p>
                    <p className="text-sm text-muted-foreground">segment(s)</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card p-4 shadow-[var(--shadow-xs)]">
                    <p className="text-3xl font-bold">{analysis.characters}</p>
                    <p className="text-sm text-muted-foreground">caractères</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Encodage</span>
                    <Badge variant={analysis.encoding === "GSM-7" ? "secondary" : "warning"}>
                      {analysis.encoding}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Limite par segment</span>
                    <span>{analysis.characters_per_segment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Compatible GSM</span>
                    <span>{analysis.is_gsm ? "Oui" : "Non"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Special Characters */}
          {specialChars.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <CardTitle>Caractères spéciaux</CardTitle>
                </div>
                <CardDescription>
                  Ces caractères augmentent la taille du message
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 rounded-md border border-border/60 bg-muted/60 p-4 font-mono text-sm">
                  {highlightSpecialChars(message, specialChars)}
                </div>
                <div className="space-y-2">
                  {specialChars.map((char, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-muted/60 px-2 py-1 font-mono">
                          {char.character}
                        </span>
                        <span className="text-muted-foreground">
                          Position {char.position}
                        </span>
                      </div>
                      {char.suggestion && char.suggestion !== "(supprimer ou remplacer)" && (
                        <span className="text-muted-foreground">
                          Suggestion: <code className="rounded bg-muted/60 px-1">{char.suggestion}</code>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Encoding Info */}
      <Card>
        <CardHeader>
          <CardTitle>Guide d&apos;encodage SMS</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="gsm7">
            <TabsList>
              <TabsTrigger value="gsm7">GSM-7</TabsTrigger>
              <TabsTrigger value="ucs2">UCS-2 (Unicode)</TabsTrigger>
            </TabsList>
            <TabsContent value="gsm7" className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-card p-4 shadow-[var(--shadow-xs)]">
                <h4 className="font-medium mb-2">Caractéristiques</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 160 caractères par segment (153 si multi-segments)</li>
                  <li>• Supporte les caractères latins de base</li>
                  <li>• Encodage le plus économique</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-4 shadow-[var(--shadow-xs)]">
                <h4 className="font-medium mb-2">Caractères supportés</h4>
                <p className="text-sm text-muted-foreground font-mono">
                  A-Z a-z 0-9 @ £ $ ¥ è é ù ì ò Ç Ø ø Å å Δ _ Φ Γ Λ Ω Π Ψ Σ Θ Ξ
                  Æ æ ß É ! &quot; # ¤ % &amp; &apos; ( ) * + , - . / : ; &lt; = &gt; ? ¡ Ä Ö Ñ Ü §
                  ¿ ä ö ñ ü à (espace) (retour ligne)
                </p>
              </div>
            </TabsContent>
            <TabsContent value="ucs2" className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-card p-4 shadow-[var(--shadow-xs)]">
                <h4 className="font-medium mb-2">Caractéristiques</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 70 caractères par segment (67 si multi-segments)</li>
                  <li>• Supporte tous les caractères Unicode</li>
                  <li>• Nécessaire pour les emojis, caractères asiatiques, etc.</li>
                </ul>
              </div>
              <div className="rounded-lg border border-amber-200/70 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200">
                      Conseil d&apos;optimisation
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Évitez les emojis et caractères spéciaux pour réduire le coût
                      de vos campagnes. Un message UCS-2 coûte plus de 2x plus cher
                      qu&apos;un message GSM-7.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
