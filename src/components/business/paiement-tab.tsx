"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table"
import {
  createPaymentMethod,
  deletePaymentMethod,
  getActiveWorkspaceId,
  getToken,
  listPaymentMethods,
  updatePaymentMethod,
  uploadWorkspaceFile,
} from "@/services/business"
import { isFlowPayType, type PaymentMethod } from "@/types/business"
import { tLabel, useAppLanguage } from "@/lib/app-language"
import { Icon } from "@/lib/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  ConfirmDialog,
  EmptyState,
  Modal,
  apiErr,
  downloadCsv,
  Hint,
} from "@/components/business/shared"

function PayIcon({ type }: { type: string }) {
  if (isFlowPayType(type)) return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M9.5 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L9.5 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M9.5 2v4H13" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6 8.5h4M6 11h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
  if (type === "mobile_money") return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="4" y="1.5" width="8" height="13" rx="1.5" stroke="#6b6b68" strokeWidth="1.4"/>
      <circle cx="8" cy="12" r="0.75" fill="#6b6b68"/>
    </svg>
  );
  if (type === "bank_transfer") return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 6h12M8 2.5 2 6v7.5h12V6L8 2.5Z" stroke="#6b6b68" strokeWidth="1.4" strokeLinejoin="round"/>
      <rect x="5.5" y="9" width="2" height="4.5" rx="0.5" stroke="#6b6b68" strokeWidth="1.4"/>
      <rect x="8.5" y="9" width="2" height="4.5" rx="0.5" stroke="#6b6b68" strokeWidth="1.4"/>
    </svg>
  );
  if (type === "cash") return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="4" width="13" height="8" rx="1.5" stroke="#6b6b68" strokeWidth="1.4"/>
      <circle cx="8" cy="8" r="2" stroke="#6b6b68" strokeWidth="1.4"/>
    </svg>
  );
  if (type === "card") return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="#6b6b68" strokeWidth="1.4"/>
      <path d="M1.5 6.5h13" stroke="#6b6b68" strokeWidth="1.4"/>
      <rect x="3.5" y="9" width="3" height="1.5" rx="0.5" fill="#6b6b68"/>
    </svg>
  );
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="#6b6b68" strokeWidth="1.4"/>
      <path d="M8 5.5v3l1.5 1.5" stroke="#6b6b68" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrashBtn({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { language } = useAppLanguage();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      title={tLabel(language, { fr: "Supprimer", en: "Delete" })}
      className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-red-50 hover:text-red-500"
    >
      <Icon name="trash" size={14} />
    </Button>
  );
}

function CatBulkDropdown({ count, onDelete, onClear, tx }: {
  count: number;
  onDelete: () => void;
  onClear: () => void;
  tx: (fr: string, en: string) => string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1">
          {tx("Actions", "Actions")}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={onDelete} className="text-red-500 focus:text-red-500 focus:bg-red-50">
          {tx("Supprimer la sélection", "Delete selection")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onClear}>
          {tx("Désélectionner", "Deselect all")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { row.push(field); field = ""; }
      else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        if (ch === '\r') i++;
        row.push(field); field = "";
        if (row.some(c => c.trim())) rows.push(row);
        row = [];
      } else { field += ch; }
    }
  }
  if (field || row.length > 0) { row.push(field); if (row.some(c => c.trim())) rows.push(row); }
  return rows;
}

type CsvFieldDef = { key: string; label: string; required?: boolean };

function CsvImportModal({ title, fields, onImport, onClose }: {
  title: string;
  fields: CsvFieldDef[];
  onImport: (rows: Record<string, string>[]) => Promise<void>;
  onClose: () => void;
}) {
  const { language } = useAppLanguage();
  const tx = (fr: string, en: string) => tLabel(language, { fr, en });
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      const parsed = parseCsvText(text);
      if (parsed.length < 2) { toast.error(tx("Le fichier CSV est vide ou invalide.", "The CSV file is empty or invalid.")); return; }
      const hdrs = parsed[0].map(h => h.trim());
      setCsvRows(parsed.slice(1)); setHeaders(hdrs);
      const auto: Record<string, string> = {};
      for (const f of fields) {
        const h = hdrs.find(h => h.toLowerCase() === f.key.toLowerCase() || h.toLowerCase() === f.label.toLowerCase());
        if (h) auto[f.key] = h;
      }
      setMapping(auto); setStep(2);
    };
    reader.readAsText(file, "utf-8");
  }

  async function doImport() {
    const missing = fields.filter(f => f.required && !mapping[f.key]);
    if (missing.length > 0) { toast.error(`Champ requis manquant : ${missing.map(f => f.label).join(", ")}`); return; }
    setImporting(true);
    try {
      const rows: Record<string, string>[] = csvRows.map(row => {
        const obj: Record<string, string> = {};
        for (const f of fields) {
          const idx = mapping[f.key] ? headers.indexOf(mapping[f.key]) : -1;
          obj[f.key] = idx >= 0 ? (row[idx] || "").trim() : "";
        }
        return obj;
      });
      await onImport(rows);
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erreur lors de l'import."); }
    finally { setImporting(false); }
  }

  const preview = csvRows.slice(0, 5);
  const mappedFields = fields.filter(f => mapping[f.key]);

  return (
    <Modal title={title} onClose={onClose}>
      {step === 1 && (
        <div>
          <div
            role="button" tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={e => e.key === "Enter" && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) loadFile(f); }}
            className={`cursor-pointer rounded-xl border-2 border-dashed py-10 text-center transition-all ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
          >
            <p className="text-[32px]">📂</p>
            <p className="mt-2 text-[14px] font-medium text-muted-foreground">Glissez un fichier CSV ou <span className="text-primary">parcourez</span></p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">Format CSV — encodage UTF-8</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-[14px] text-muted-foreground"><span className="font-medium text-foreground">{csvRows.length}</span> ligne{csvRows.length !== 1 ? "s" : ""} détectée{csvRows.length !== 1 ? "s" : ""}. Associez les colonnes CSV aux champs.</p>
          <div className="space-y-2.5">
            {fields.map(f => (
              <div key={f.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-[13.5px] font-medium text-muted-foreground sm:w-36 sm:shrink-0">
                  {f.label}{f.required && <span className="ml-0.5 text-[#b42318]">*</span>}
                </span>
                <Select value={mapping[f.key] || ""} onValueChange={v => setMapping(prev => ({ ...prev, [f.key]: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="— Ignorer —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Ignorer —</SelectItem>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>← Retour</Button>
            <Button variant="outline" onClick={() => setStep(3)}>Aperçu →</Button>
          </DialogFooter>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-[14px] text-muted-foreground">Aperçu (<span className="font-medium text-foreground">{csvRows.length}</span> ligne{csvRows.length !== 1 ? "s" : ""} au total) :</p>
          {mappedFields.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <Table className="text-[13.5px]">
                <TableHeader>
                  <TableRow className="border-b border-border bg-card hover:bg-card">
                    {mappedFields.map(f => (
                      <TableHead key={f.key} className="h-auto whitespace-nowrap px-4 py-2.5 text-[11.5px] font-semibold normal-case tracking-wide text-muted-foreground">{f.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, ri) => (
                    <TableRow key={ri} className="border-b border-border last:border-0 hover:bg-muted/50">
                      {mappedFields.map(f => {
                        const idx = headers.indexOf(mapping[f.key]);
                        return (
                          <TableCell key={f.key} className="max-w-[140px] truncate px-4 py-3.5 text-[13.5px] text-foreground">
                            {row[idx] || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-[14px] text-warning">Aucun champ associé — revenez à l&apos;étape précédente.</p>
          )}
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>← Retour</Button>
            <Button onClick={doImport} disabled={importing || mappedFields.length === 0}>
              {importing ? "Import en cours…" : `Importer ${csvRows.length} ligne${csvRows.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </div>
      )}
    </Modal>
  );
}

// ─── CATALOGUE ─────────────────────────────────────────────────────────────────

function ImageDropZone({ value, onChange, onUploading, label = "Image", square = false }: {
  value: string;
  onChange: (v: string) => void;
  onUploading?: (uploading: boolean) => void;
  label?: string;
  square?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  async function loadFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Format invalide. PNG, JPG ou WebP uniquement."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image trop lourde (max 5 Mo)."); return; }
    const blobUrl = URL.createObjectURL(file);
    setLocalPreview(blobUrl);
    setUploading(true);
    onUploading?.(true);
    try {
      const token = getToken();
      const wsId = getActiveWorkspaceId();
      if (token && wsId) {
        const asset = await uploadWorkspaceFile(token, wsId, file);
        onChange(asset.url);
      } else {
        onChange(blobUrl);
      }
    } catch {
      toast.error("Impossible d'envoyer l'image.");
    } finally {
      setUploading(false);
      onUploading?.(false);
    }
  }

  const preview = localPreview || (value.trim() ? value.trim() : null);

  return (
    <div className={cn("space-y-2", square && "w-36")}>
      <Label>{label}</Label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => { if (!uploading) fileRef.current?.click(); }}
        onKeyDown={(e) => { if (e.key === "Enter" && !uploading) fileRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) loadFile(file);
        }}
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all",
          square && "aspect-square",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        )}
      >
        {uploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-card/80">
            <svg className="animate-spin text-primary" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".2"/>
              <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
        )}
        {preview ? (
          <>
            <Image
              src={preview}
              alt="Aperçu"
              width={square ? 144 : 800}
              height={square ? 144 : 288}
              unoptimized
              className={square ? "h-full w-full object-contain p-2" : "h-36 w-full object-cover"}
              onError={() => setLocalPreview(null)}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
              <span className="rounded-lg bg-card/90 px-3 py-1.5 text-[13px] font-medium text-foreground">Changer</span>
            </div>
          </>
        ) : (
          <div className={cn("flex flex-col items-center justify-center text-center", square ? "h-full gap-1.5" : "py-9")}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="mb-3 text-muted-foreground">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!square && <p className="text-[13.5px] font-medium text-muted-foreground">Glissez une image ou <span className="text-primary">parcourez</span></p>}
            <p className={cn("text-muted-foreground", square ? "text-[11px]" : "mt-1 text-[12px]")}>PNG, JPG, WebP</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
      </div>
    </div>
  );
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

export function PaiementTab() {
  const { language } = useAppLanguage();
  const tx = useCallback((fr: string, en: string) => tLabel(language, { fr, en }), [language]);
  const [methods, setMethods]     = useState<PaymentMethod[]>([]);
  const [loading, setLoading]     = useState(true);
  const [pmView, setPmView]       = useState<"list" | "form">("list");
  const [saving, setSaving]       = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [pmRowSelection, setPmRowSelection] = useState<RowSelectionState>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showBulkMethodsConfirm, setShowBulkMethodsConfirm] = useState(false);

  function exportCsv() {
    const rows: string[][] = [["Nom", "Type", "Fournisseur", "Instructions", "Actif"]];
    for (const m of methods) {
      rows.push([m.name, m.paymentType || "", m.provider || "", m.instructions || "", m.isActive ? "oui" : "non"]);
    }
    downloadCsv(rows, "paiement-methodes.csv");
  }

  async function onImportMethods(rows: Record<string, string>[]) {
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    let count = 0;
    for (const row of rows) {
      if (!row.name || !row.type) continue;
      const m = await createPaymentMethod(token, wsId, {
        name: row.name, payment_type: row.type,
        provider: row.provider || undefined, instructions: row.instructions || undefined, is_active: true,
      });
      setMethods(p => [...p, m]); count++;
    }
    toast.success(language.startsWith("en") ? `${count} method${count !== 1 ? "s" : ""} imported.` : `${count} méthode${count !== 1 ? "s" : ""} importée${count !== 1 ? "s" : ""}.`);
  }

  async function doDeleteMethod(id: string) {
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return; setDeletingId(id);
    try {
      await deletePaymentMethod(token, wsId, id);
      setMethods(p => p.filter(m => m.id !== id));
      setPmRowSelection(prev => { const next = { ...prev }; delete next[id]; return next; });
      toast.success(tx("Méthode supprimée.", "Method deleted."));
    } catch (err) { toast.error(apiErr(err, tx)); }
    finally { setDeletingId(null); }
  }
  function bulkDeleteMethods() {
    if (Object.values(pmRowSelection).filter(Boolean).length === 0) return;
    setShowBulkMethodsConfirm(true);
  }

  async function confirmBulkDeleteMethods() {
    setShowBulkMethodsConfirm(false);
    const token = getToken(); const wsId = getActiveWorkspaceId();
    const ids = Object.entries(pmRowSelection).filter(([, v]) => v).map(([id]) => id);
    if (!token || !wsId || ids.length === 0) return;
    try {
      await Promise.all(ids.map(id => deletePaymentMethod(token, wsId, id)));
      setMethods(p => p.filter(m => !ids.includes(m.id)));
      setPmRowSelection({});
      toast.success(language.startsWith("en") ? `${ids.length} method${ids.length > 1 ? "s" : ""} deleted.` : `${ids.length} méthode${ids.length > 1 ? "s" : ""} supprimée${ids.length > 1 ? "s" : ""}.`);
    } catch (err) { toast.error(apiErr(err, tx)); }
  }

  const [editingMethod, setEditingMethod]     = useState<PaymentMethod | null>(null);
  const [pmName, setPmName]                   = useState("");
  const [pmType, setPmType]                   = useState("mobile_money");
  const [pmProvider, setPmProvider]           = useState("");
  const [pmRef, setPmRef]                     = useState("");
  const [pmInstructions, setPmInstructions]   = useState("");
  const [pmRequiresProof, setPmRequiresProof] = useState(false);
  const [pmActive, setPmActive]               = useState(true);
  const [pmQrCode, setPmQrCode]               = useState("");
  const [pmQrUploading, setPmQrUploading]     = useState(false);

  useEffect(() => {
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    let ok = true; setLoading(true);
    listPaymentMethods(token, wsId)
      .then(data => { if (ok) setMethods(data); })
      .catch(() => { if (ok) toast.error(tx("Impossible de charger les méthodes de paiement.", "Unable to load payment methods.")); })
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [tx]);

  function openModal() { setEditingMethod(null); setPmName(""); setPmType("mobile_money"); setPmProvider(""); setPmRef(""); setPmInstructions(""); setPmRequiresProof(false); setPmActive(true); setPmQrCode(""); setPmView("form"); }
  function openEditModal(m: PaymentMethod) {
    setEditingMethod(m); setPmName(m.name); setPmType(m.paymentType || "mobile_money"); setPmProvider(m.provider || ""); setPmRef(m.accountReference || ""); setPmInstructions(m.instructions || ""); setPmRequiresProof(m.requiresPaymentProof || false); setPmActive(m.isActive); setPmQrCode(m.qrCode || ""); setPmView("form");
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (token && wsId) {
      listPaymentMethods(token, wsId).then(fresh => {
        const found = fresh.find(x => x.id === m.id);
        if (found) {
          setMethods(fresh);
          setEditingMethod(found);
          setPmQrCode(found.qrCode || "");
        }
      }).catch(() => {});
    }
  }

  async function handleToggle(m: PaymentMethod) {
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    const next = !m.isActive;
    setMethods(p => p.map(x => x.id === m.id ? { ...x, isActive: next } : x));
    setTogglingId(m.id);
    try {
      await updatePaymentMethod(token, wsId, m.id, { is_active: next });
      toast.success(next ? tx("Méthode activée.", "Method enabled.") : tx("Méthode désactivée.", "Method disabled."));
    } catch (err) {
      setMethods(p => p.map(x => x.id === m.id ? { ...x, isActive: !next } : x));
      toast.error(err instanceof Error ? err.message : tx("Impossible de modifier.", "Unable to update."));
    } finally { setTogglingId(null); }
  }

  async function saveMethod(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return; setSaving(true);
    try {
      const payload = { name: pmName.trim(), payment_type: pmType, provider: pmProvider.trim() || undefined, account_reference: pmRef.trim() || undefined, instructions: pmInstructions.trim() || undefined, requires_payment_proof: pmRequiresProof, is_active: pmActive, qr_code: pmQrCode.trim() || undefined };
      if (editingMethod) {
        await updatePaymentMethod(token, wsId, editingMethod.id, payload);
        toast.success(tx("Méthode mise à jour.", "Method updated."));
      } else {
        await createPaymentMethod(token, wsId, payload);
        toast.success(tx("Méthode de paiement ajoutée.", "Payment method added."));
      }
      const fresh = await listPaymentMethods(token, wsId);
      setMethods(fresh);
      setPmView("list");
    } catch (err) { toast.error(apiErr(err, tx)); }
    finally { setSaving(false); }
  }

  const PM_LABELS: Record<string, string> = {
    mobile_money: "Mobile Money",
    bank_transfer: tx("Virement", "Bank transfer"),
    cash: tx("Espèces", "Cash"),
    card: tx("Carte", "Card"),
    custom: tx("Autre", "Other"),
    flow_pay: "Flow Pay",
    duo_pay: "Flow Pay",
  };

  function paymentDisplayName(method: PaymentMethod): string {
    if (isFlowPayType(method.paymentType)) return "Flow Pay"
    return method.name
  }

  const pmSelectedCount = Object.values(pmRowSelection).filter(Boolean).length;

  // Responsive class per column id
  const pmColClass: Partial<Record<string, string>> = {
    type:         "hidden sm:table-cell",
    provider:     "hidden md:table-cell",
    reference:    "hidden md:table-cell",
    instructions: "hidden lg:table-cell",
    deposit:      "hidden sm:table-cell",
  };

  const pmColumns: ColumnDef<PaymentMethod>[] = [
    {
      id: "select",
      header: ({ table: t }) => (
        <Checkbox
          checked={t.getIsAllPageRowsSelected() || (t.getIsSomePageRowsSelected() ? "indeterminate" : false)}
          onCheckedChange={v => t.toggleAllPageRowsSelected(!!v)}
          aria-label={tx("Tout sélectionner", "Select all")}
        />
      ),
      cell: ({ row }) => (
        <div onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={v => row.toggleSelected(!!v)}
            aria-label={tx("Sélectionner la ligne", "Select row")}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "icon",
      header: () => null,
      cell: ({ row }) => (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
          <PayIcon type={row.original.paymentType} />
        </div>
      ),
      enableSorting: false,
    },
    {
      id: "name",
      header: () => (
        <span className="flex items-center gap-2">
          <span className="whitespace-nowrap">{tx("Nom", "Name")}</span>
          {pmSelectedCount > 0 && <CatBulkDropdown count={pmSelectedCount} onDelete={bulkDeleteMethods} onClear={() => setPmRowSelection({})} tx={tx} />}
        </span>
      ),
      cell: ({ row }) => (
        <div>
          <p className="whitespace-nowrap font-medium text-foreground">{paymentDisplayName(row.original)}</p>
          {isFlowPayType(row.original.paymentType) && (
            <p className="text-[11px] text-muted-foreground">{tx("Agrégateur de paiement mobile Flow · Airtel Money · MTN", "Flow mobile payment aggregator · Airtel Money · MTN")}</p>
          )}
          <p className="sm:hidden text-[12px] font-normal text-muted-foreground">{PM_LABELS[row.original.paymentType] || row.original.paymentType}</p>
        </div>
      ),
      enableSorting: false,
    },
    {
      id: "type",
      header: () => <span className="whitespace-nowrap">{tx("Type", "Type")}</span>,
      cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{PM_LABELS[row.original.paymentType] || row.original.paymentType}</span>,
      enableSorting: false,
    },
    {
      id: "provider",
      header: () => <span className="whitespace-nowrap">{tx("Opérateur", "Provider")}</span>,
      cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.provider || <span className="text-muted-foreground/70">—</span>}</span>,
      enableSorting: false,
    },
    {
      id: "reference",
      header: () => <span className="whitespace-nowrap">{tx("Référence", "Reference")}</span>,
      cell: ({ row }) => <span className="whitespace-nowrap font-mono text-foreground">{row.original.accountReference || <span className="text-muted-foreground/70">—</span>}</span>,
      enableSorting: false,
    },
    {
      id: "instructions",
      header: () => <span className="whitespace-nowrap">{tx("Instructions", "Instructions")}</span>,
      cell: ({ row }) => (
        row.original.instructions
          ? <span className="line-clamp-1 max-w-[180px] text-muted-foreground">{row.original.instructions}</span>
          : <span className="text-muted-foreground/70">—</span>
      ),
      enableSorting: false,
    },
    {
      id: "deposit",
      header: () => <span className="whitespace-nowrap">{tx("Acompte", "Deposit")}</span>,
      cell: ({ row }) => (
        row.original.requiresDeposit
          ? <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11.5px] font-medium bg-warning/10 border border-warning/30 text-warning">{tx("Requis", "Required")}</span>
          : <span className="text-muted-foreground/70">—</span>
      ),
      enableSorting: false,
    },
    {
      id: "status",
      header: () => <span className="whitespace-nowrap">{tx("Statut", "Status")}</span>,
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div onClick={e => e.stopPropagation()}>
            <Switch
              checked={m.isActive}
              onCheckedChange={() => handleToggle(m)}
              disabled={togglingId === m.id}
              title={m.isActive ? tx("Désactiver", "Disable") : tx("Activer", "Enable")}
              className="scale-75"
            />
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <div onClick={e => e.stopPropagation()}>
          <TrashBtn onClick={() => doDeleteMethod(row.original.id)} disabled={deletingId === row.original.id} />
        </div>
      ),
      enableSorting: false,
    },
  ];

  const pmTable = useReactTable({
    data: methods,
    columns: pmColumns,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    state: { rowSelection: pmRowSelection },
    onRowSelectionChange: setPmRowSelection,
    enableRowSelection: true,
  });

  if (pmView === "form") {
    if (isFlowPayType(pmType)) {
      async function toggleFlowPay() {
        const token = getToken(); const wsId = getActiveWorkspaceId();
        if (!token || !wsId || !editingMethod) return;
        const next = !pmActive;
        setSaving(true);
        try {
          await updatePaymentMethod(token, wsId, editingMethod.id, { is_active: next });
          toast.success(next ? tx("Flow Pay activé.", "Flow Pay enabled.") : tx("Flow Pay désactivé.", "Flow Pay disabled."));
          const fresh = await listPaymentMethods(token, wsId);
          setMethods(fresh);
          setPmView("list");
        } catch (err) { toast.error(apiErr(err, tx)); }
        finally { setSaving(false); }
      }

      return (
        <div>
          {/* Header */}
          <div className="mb-5 flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={() => setPmView("list")} className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground sm:h-8 sm:w-8" aria-label={tx("Retour", "Back")}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Button>
            <div className="flex flex-1 items-center gap-2.5">
              <h2 className="text-[16px] font-semibold text-foreground">Flow Pay</h2>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${pmActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                {pmActive ? tx("Actif", "Active") : tx("Inactif", "Inactive")}
              </span>
            </div>
          </div>

          {/* ── Mobile Money ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {/* Providers strip */}
            <div className="flex items-center gap-2.5 px-5 py-3">
              <Image src="/icons/momo-logo.png" alt="MTN Mobile Money" width={28} height={28} className="rounded-md object-contain" />
              <Image src="/icons/am-logo.png" alt="Airtel Money" width={28} height={28} className="rounded-md object-contain" />
              <span className="text-[12px] text-muted-foreground">{tx("Airtel Money · MTN Mobile Money", "Airtel Money · MTN Mobile Money")}</span>
            </div>
            {/* Row 1 — débit automatique */}
            <div className="flex items-start gap-3.5 px-5 py-4">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="3" y="1.5" width="10" height="13" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M6 4.5h4M6 7.5h4M6 10.5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="text-[13.5px] font-medium text-foreground">
                  {tx("Débit automatique", "Automatic debit")}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {tx(
                    "Le client est débité directement depuis Airtel Money ou MTN Mobile Money (Congo Brazzaville) — sans saisir de code ni quitter la boutique.",
                    "The customer is charged directly from Airtel Money or MTN Mobile Money (Congo Brazzaville) — no code entry, no redirect."
                  )}
                </p>
              </div>
            </div>
            {/* Row 2 — aucun frais */}
            <div className="flex items-start gap-3.5 px-5 py-4">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M13 4.5L6.5 11 3 7.5" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="text-[13.5px] font-medium text-foreground">
                  {tx("Aucun frais à la collecte", "No collection fee")}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {tx(
                    "Le client paie exactement le montant affiché. Zéro frais supplémentaire lors du paiement.",
                    "The customer pays exactly the displayed amount. Zero extra charge at checkout."
                  )}
                </p>
              </div>
            </div>
            {/* Row 3 — frais au retrait */}
            <div className="flex items-start gap-3.5 px-5 py-4">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6" stroke="#d97706" strokeWidth="1.4"/>
                  <path d="M8 5v3.5l2 1.5" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="text-[13.5px] font-medium text-foreground">
                  {tx("7 % de frais au retrait", "7% fee on withdrawal")}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {tx(
                    "Les fonds s'accumulent dans votre portefeuille Flow Pay. Les frais de 7 % s'appliquent uniquement au moment où vous transférez vers votre mobile money.",
                    "Funds accumulate in your Flow Pay wallet. The 7% fee applies only when you transfer to your mobile money."
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* ── Carte bancaire ───────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {/* Header strip */}
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-2.5">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0">
                  <rect x="1.5" y="4" width="17" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M1.5 8h17" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M4.5 12.5h4M13.5 12.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <span className="text-[13px] font-semibold text-foreground">
                  {tx("Paiement par carte", "Card payment")}
                </span>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11.5px] font-medium text-primary">
                Visa · Mastercard
              </span>
            </div>
            {/* Row — lien Stripe */}
            <div className="flex items-start gap-3.5 px-5 py-4">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M9 3h4v4M13 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 5H3a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="text-[13.5px] font-medium text-foreground">
                  {tx("Lien de paiement Stripe", "Stripe payment link")}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {tx(
                    "Générez un lien sécurisé que votre client règle par carte bancaire (Visa, Mastercard). Le montant est crédité automatiquement dans votre portefeuille Carte.",
                    "Generate a secure link your customer pays by card (Visa, Mastercard). The amount is automatically credited to your Card wallet."
                  )}
                </p>
              </div>
            </div>
            {/* Row — portefeuille séparé */}
            <div className="flex items-start gap-3.5 px-5 py-4">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="2" y="5" width="12" height="9" rx="1.5" stroke="#7c3aed" strokeWidth="1.4"/>
                  <path d="M11 9a1 1 0 11-2 0 1 1 0 012 0z" fill="#7c3aed"/>
                  <path d="M5 5V4a3 3 0 016 0v1" stroke="#7c3aed" strokeWidth="1.4"/>
                </svg>
              </div>
              <div>
                <p className="text-[13.5px] font-medium text-foreground">
                  {tx("Portefeuille Carte dédié", "Dedicated Card wallet")}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {tx(
                    "Les encaissements par carte sont isolés dans un portefeuille séparé. Le retrait se fait par virement bancaire ou en espèces (délai 48h).",
                    "Card collections are held in a separate wallet. Withdrawals are processed by bank transfer or cash (48h processing time)."
                  )}
                </p>
              </div>
            </div>
            {/* CTA */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5">
              <p className="text-[12px] text-muted-foreground">
                {tx("Générez vos liens depuis l'onglet Portefeuille", "Generate links from the Wallet tab")}
              </p>
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 gap-1.5 text-[12.5px] bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => {
                  if (typeof window !== "undefined" && window.__duoSwitchBusinessTab) {
                    window.__duoSwitchBusinessTab("portefeuille");
                  }
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="1" y="3.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M4 10h3M10.5 10h1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                {tx("Aller au Portefeuille", "Go to Wallet")}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPmView("list")}>{tx("Retour", "Back")}</Button>
            <Button
              onClick={() => { void toggleFlowPay(); }}
              disabled={saving}
              variant={pmActive ? "outline" : "default"}
            >
              {saving ? tx("Mise à jour…", "Updating…") : pmActive ? tx("Désactiver", "Disable") : tx("Activer", "Enable")}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="mb-5 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setPmView("list")}
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground sm:h-8 sm:w-8"
            aria-label={tx("Retour", "Back")}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Button>
          <div>
            <h2 className="text-[16px] font-semibold text-foreground">
              {editingMethod ? tx("Modifier la méthode", "Edit method") : tx("Nouvelle méthode de paiement", "New payment method")}
            </h2>
            <p className="text-[13.5px] text-muted-foreground">{tx("Remplissez les informations ci-dessous", "Fill in the information below")}</p>
          </div>
        </div>

        <form onSubmit={saveMethod}>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="space-y-1.5">
              <Label>{tx("Nom", "Name")} *</Label>
              <Input required maxLength={200} value={pmName} onChange={e => setPmName(e.target.value)} placeholder={tx("Ex : Wave · +225 07 00 00 00", "e.g. Wave · +225 07 00 00 00")} />
            </div>
            <div className="space-y-1.5">
              <Label>{tx("Type", "Type")} *</Label>
              <Select value={pmType} onValueChange={setPmType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="bank_transfer">{tx("Virement bancaire", "Bank transfer")}</SelectItem>
                  <SelectItem value="cash">{tx("Espèces", "Cash")}</SelectItem>
                  <SelectItem value="card">{tx("Carte bancaire", "Bank card")}</SelectItem>
                  <SelectItem value="custom">{tx("Autre", "Other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {pmType !== "cash" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{tx("Opérateur / Banque", "Provider / Bank")}</Label>
                  <Input value={pmProvider} onChange={e => setPmProvider(e.target.value)} placeholder={tx("Ex : Wave, MTN", "e.g. Wave, MTN")} />
                </div>
                <div className="space-y-1.5">
                  <Label>{tx("Numéro / Référence", "Number / Reference")}</Label>
                  <Input value={pmRef} onChange={e => setPmRef(e.target.value)} placeholder="+225 07 00 00 00" />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{tx("Instructions pour le client", "Instructions for the customer")}</Label>
              <Textarea value={pmInstructions} onChange={e => setPmInstructions(e.target.value)} rows={3} maxLength={1000} placeholder={tx("Ex : Envoyez à ce numéro et partagez la capture.", "e.g. Send to this number and share the screenshot.")} />
            </div>
            {pmType !== "cash" && (
              <div className="space-y-2">
                <ImageDropZone value={pmQrCode} onChange={setPmQrCode} onUploading={setPmQrUploading} label={tx("QR code de paiement", "Payment QR code")} square />
                {pmQrCode && (
                  <Button type="button" variant="outline" size="sm" className="text-[12px] text-red-500 hover:text-red-600 hover:border-red-300" onClick={() => setPmQrCode("")}>
                    {tx("Supprimer le QR code", "Remove QR code")}
                  </Button>
                )}
              </div>
            )}
            <div className="space-y-3">
              {pmType !== "cash" && (
                <Label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox checked={pmRequiresProof} onCheckedChange={v => setPmRequiresProof(!!v)} />
                  <span className="text-[14px] text-muted-foreground">{tx("Exige une preuve de paiement", "Requires payment proof")}<Hint text={tx("Le client doit envoyer une capture d'écran ou une preuve de virement.", "The customer must send a screenshot or transfer proof.")} /></span>
                </Label>
              )}
              <Label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox checked={pmActive} onCheckedChange={v => setPmActive(!!v)} />
                <span className="text-[14px] text-muted-foreground">{tx("Méthode active", "Active method")}</span>
              </Label>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPmView("list")}>{tx("Annuler", "Cancel")}</Button>
            <Button type="submit" disabled={saving || pmQrUploading}>
              {saving
                ? (editingMethod ? tx("Mise à jour…", "Updating…") : tx("Création…", "Creating…"))
                : pmQrUploading
                  ? tx("Upload QR…", "Uploading QR…")
                  : (editingMethod ? tx("Mettre à jour", "Update") : tx("Ajouter la méthode", "Add method"))}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[14px] font-bold text-foreground">{tx("Paiements", "Payments")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {tx("Importer", "Import")}
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={methods.length === 0}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {tx("Exporter", "Export")}
          </Button>
          <Button onClick={openModal}>+ {tx("Ajouter une méthode", "Add method")}</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[14px] text-muted-foreground">{tx("Chargement…", "Loading…")}</div>
      ) : methods.length === 0 ? (
        <EmptyState icon="creditCard" title={tx("Aucune méthode de paiement", "No payment method")} desc={tx("Ajoutez Mobile Money, virement ou espèces — l'agent indiquera au client comment payer.", "Add Mobile Money, bank transfer, or cash — the agent will tell the customer how to pay.")} onAdd={openModal} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table className="text-[13.5px]" style={{ minWidth: 340 }}>
            <TableHeader className="bg-card">
              {pmTable.getHeaderGroups().map(hg => (
                <TableRow key={hg.id} className="border-b border-border hover:bg-transparent">
                  {hg.headers.map(header => (
                    <TableHead
                      key={header.id}
                      className={`h-auto px-4 py-2.5 text-[11.5px] font-semibold normal-case tracking-wide text-muted-foreground ${pmColClass[header.id] ?? ""}`}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {pmTable.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  onClick={() => openEditModal(row.original)}
                  className={`border-0 cursor-pointer transition-colors hover:bg-muted/50 ${row.getIsSelected() ? "bg-primary/5" : ""}`}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell
                      key={cell.id}
                      className={`px-4 py-3.5 text-[13.5px] ${pmColClass[cell.column.id] ?? ""}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showImport && (
        <CsvImportModal
          title={tx("Importer des méthodes de paiement", "Import payment methods")}
          fields={[
            { key: "name", label: tx("Nom", "Name"), required: true },
            { key: "type", label: tx("Type", "Type"), required: true },
            { key: "provider", label: tx("Fournisseur", "Provider") },
            { key: "instructions", label: tx("Instructions", "Instructions") },
          ]}
          onImport={onImportMethods}
          onClose={() => setShowImport(false)}
        />
      )}
      {showBulkMethodsConfirm && (
        <ConfirmDialog
          title={tx(`Supprimer ${pmSelectedCount} méthode${pmSelectedCount > 1 ? "s" : ""} ?`, `Delete ${pmSelectedCount} method${pmSelectedCount > 1 ? "s" : ""}?`)}
          message={tx("Ces méthodes de paiement seront définitivement supprimées.", "These payment methods will be permanently deleted.")}
          confirmLabel={tx("Supprimer", "Delete")}
          onConfirm={confirmBulkDeleteMethods}
          onCancel={() => setShowBulkMethodsConfirm(false)}
        />
      )}
    </div>
  );
}
