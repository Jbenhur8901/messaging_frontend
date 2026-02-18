"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TemplateVariable {
  key: string
  componentType: "header" | "body" | "button"
  index: number
  buttonIndex?: number
  buttonSubType?: string
}

interface FieldOption {
  value: string
  label: string
}

interface PersonalizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateVariables: TemplateVariable[]
  variableMapping: Record<string, string>
  onVariableMappingChange: (mapping: Record<string, string>) => void
  systemVariableOptions: FieldOption[]
  customVariableOptions: FieldOption[]
}

export function PersonalizationDialog({
  open,
  onOpenChange,
  templateVariables,
  variableMapping,
  onVariableMappingChange,
  systemVariableOptions,
  customVariableOptions,
}: PersonalizationDialogProps) {
  const handleChange = (key: string, value: string) => {
    onVariableMappingChange({ ...variableMapping, [key]: value })
  }

  const allMapped = templateVariables.every((v) => !!variableMapping[v.key])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Configurer les variables</DialogTitle>
          <DialogDescription className="text-[12px]">
            Associez chaque variable du template à un champ de contact.
          </DialogDescription>
        </DialogHeader>

        {templateVariables.length === 0 ? (
          <div className="rounded-lg border border-border/40 bg-muted/60 p-4 text-sm text-muted-foreground">
            Ce template ne contient pas de variables ({"{{1}}, {{2}}, ..."}).
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {templateVariables.map((variable) => (
              <div key={variable.key} className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-center">
                <div className="text-[13px] font-medium">
                  {variable.componentType.toUpperCase()} · {"{{"}{variable.index}{"}}"}
                </div>
                <Select
                  value={variableMapping[variable.key] || ""}
                  onValueChange={(value) => handleChange(variable.key, value)}
                >
                  <SelectTrigger className="h-8 text-[13px]">
                    <SelectValue placeholder="Choisir un champ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__system_group__" disabled>
                      Infos contact (système)
                    </SelectItem>
                    {systemVariableOptions.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom_group__" disabled>
                      Champs personnalisés globaux
                    </SelectItem>
                    {customVariableOptions.length === 0 ? (
                      <SelectItem value="__no_custom__" disabled>
                        Aucun champ personnalisé global
                      </SelectItem>
                    ) : (
                      customVariableOptions.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            size="sm"
            className="h-8 text-[12px]"
            onClick={() => onOpenChange(false)}
            disabled={templateVariables.length > 0 && !allMapped}
          >
            {allMapped ? "Confirmer" : `${templateVariables.filter((v) => !!variableMapping[v.key]).length} / ${templateVariables.length} mappées`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
