"use client"

import { useCallback, useEffect, useState } from "react"
import { Icon, type IconName } from "@/lib/icons"
import { tLabel, useAppLanguage } from "@/lib/app-language"
import { DashboardPageHeader, DashboardShell } from "@/components/business/dashboard-shell"
import { CatalogueTab } from "@/components/business/catalogue-tab"
import { DocumentsTab } from "@/components/business/documents-tab"
import { PaiementTab } from "@/components/business/paiement-tab"
import { OperationsTab } from "@/components/business/operations-tab"
import { PortefeuilleTab } from "@/components/business/portefeuille-tab"
import { cn } from "@/lib/utils"

type TabId = "catalogue" | "documents" | "paiement" | "operations" | "portefeuille"

const TABS: { id: TabId; icon: IconName }[] = [
  { id: "catalogue", icon: "business" },
  { id: "documents", icon: "document" },
  { id: "paiement", icon: "creditCard" },
  { id: "operations", icon: "invoice" },
  { id: "portefeuille", icon: "billing" },
]

declare global {
  interface Window {
    __duoSwitchBusinessTab?: (tabId: string) => void
  }
}

function getTabLabel(tabId: TabId, language: "fr" | "en") {
  const labels: Record<TabId, { fr: string; en: string }> = {
    catalogue: { fr: "Catalogue", en: "Catalog" },
    documents: { fr: "Documents", en: "Documents" },
    paiement: { fr: "Paiements", en: "Payments" },
    operations: { fr: "Opérations enregistrées", en: "Recorded operations" },
    portefeuille: { fr: "Portefeuille", en: "Wallet" },
  }
  return tLabel(language, labels[tabId])
}

export default function BusinessPage() {
  const { language } = useAppLanguage()
  const [activeTab, setActiveTab] = useState<TabId>("catalogue")
  const [loaded, setLoaded] = useState<Set<TabId>>(new Set<TabId>(["catalogue"]))

  const switchTab = useCallback((tab: TabId) => {
    setActiveTab(tab)
    setLoaded((prev) => new Set([...prev, tab]))
  }, [])

  useEffect(() => {
    window.__duoSwitchBusinessTab = (tabId: string) => {
      if (TABS.some((tab) => tab.id === tabId)) {
        switchTab(tabId as TabId)
      }
    }
    return () => {
      delete window.__duoSwitchBusinessTab
    }
  }, [switchTab])

  return (
    <DashboardShell maxWidth="1180px" innerClassName="space-y-5">
      <DashboardPageHeader
        eyebrow={tLabel(language, { fr: "Commerce", en: "Commerce" })}
        title="Business"
        description={tLabel(language, {
          fr: "Catalogue, documents, paiements, opérations IA et portefeuille — tout au même endroit.",
          en: "Catalog, documents, payments, AI operations and wallet — all in one place.",
        })}
      />

      <div>
        <div className="rounded-[14px] bg-card p-1.5 shadow-lg border border-border sm:hidden">
          <select
            value={activeTab}
            onChange={(e) => switchTab(e.target.value as TabId)}
            className="h-10 w-full rounded-[10px] border-0 bg-muted px-3 text-[14px] font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/15"
          >
            {TABS.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {getTabLabel(tab.id, language)}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden rounded-[16px] bg-card p-1.5 shadow-lg border border-border sm:block">
          <div className="grid grid-cols-2 gap-1 lg:grid-cols-5">
            {TABS.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id)}
                  className={cn(
                    "relative flex items-center justify-center gap-2 rounded-[10px] px-2 py-2.5 text-[12px] font-medium transition-all duration-200 lg:px-3 lg:text-[13px]",
                    active
                      ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(255,204,0,0.35)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon name={tab.icon} size={15} className={active ? "text-primary-foreground" : "text-muted-foreground"} />
                  <span className="truncate">{getTabLabel(tab.id, language)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        {loaded.has("catalogue") ? (
          <div className={activeTab !== "catalogue" ? "hidden" : ""}>
            <CatalogueTab />
          </div>
        ) : null}
        {loaded.has("documents") ? (
          <div className={activeTab !== "documents" ? "hidden" : ""}>
            <DocumentsTab />
          </div>
        ) : null}
        {loaded.has("paiement") ? (
          <div className={activeTab !== "paiement" ? "hidden" : ""}>
            <PaiementTab />
          </div>
        ) : null}
        {loaded.has("operations") ? (
          <div className={activeTab !== "operations" ? "hidden" : ""}>
            <OperationsTab />
          </div>
        ) : null}
        {loaded.has("portefeuille") ? (
          <div className={activeTab !== "portefeuille" ? "hidden" : ""}>
            <PortefeuilleTab />
          </div>
        ) : null}
      </div>
    </DashboardShell>
  )
}
