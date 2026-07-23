"use client"

import Image from "next/image"
import { Icon, type IconName } from "@/lib/icons"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import { fr as dateFnsFr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import {
  apiRequest,
  addCatalogItemImage,
  bulkDeleteCatalogCategories,
  bulkDeleteCatalogImages,
  bulkDeleteCatalogItems,
  createCatalogCategory,
  createCatalogItem,
  createDeliveryZone,
  deleteCatalogCategory,
  deleteCatalogItem,
  deleteCatalogItemImage,
  deleteDeliveryZone,
  getActiveWorkspaceId,
  getToken,
  importCatalogData,
  listCatalogCategories,
  listCatalogItems,
  listDeliveryZones,
  updateCatalogCategory,
  updateCatalogItem,
  updateCatalogItemImage,
  updateDeliveryZone,
  uploadWorkspaceFile,
} from "@/services/business"
import type { CatalogCategory, CatalogItem, CatalogItemImage, DeliveryZone, ImportCatalogPayload } from "@/types/business"
import { tLabel, useAppLanguage } from "@/lib/app-language"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DialogFooter } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  BulkBar,
  ConfirmDialog,
  EmptyState,
  Hint,
  Modal,
  Pagination,
  PAGE_SIZE,
  SECTION_HEAD,
  SkeletonRow,
  apiErr,
  downloadCsv,
  fmt,
} from "@/components/business/shared"

type CsvFieldDef = { key: string; label: string; required?: boolean };

const FORM_HEAD = "mb-3 text-[13.5px] font-semibold uppercase tracking-wide text-primary";

const ITEM_TYPES = [
  { value: "product",    label: "Produit physique" },
  { value: "service",    label: "Service numérique" },
  { value: "room_offer", label: "Créneau / RDV" },
  { value: "menu_item",  label: "Forfait récurrent" },
  { value: "delivery",   label: "Livraison" },
];

const itemTypeLabel = (v: string) => ITEM_TYPES.find(t => t.value === v)?.label || v;

const ITEM_TYPE_BADGE: Record<string, string> = {
  product:    "bg-primary/15 text-primary",
  service:    "bg-blue-500/15 text-blue-400",
  delivery:   "bg-emerald-500/15 text-emerald-400",
  room_offer: "bg-purple-500/15 text-purple-400",
  menu_item:  "bg-orange-500/15 text-orange-400",
}

function ItemTypeBadge({ type }: { type?: string | null }) {
  const t = type || "product"
  const labels: Record<string, string> = {
    product: "Produit", service: "Service", delivery: "Livraison",
    room_offer: "Créneau", menu_item: "Forfait",
  }
  return (
    <Badge
      variant="secondary"
      className={cn("border-0 text-[11px] font-medium", ITEM_TYPE_BADGE[t] ?? "bg-muted text-muted-foreground")}
    >
      {labels[t] ?? t}
    </Badge>
  )
}

function ItemTypePlaceholder({ type, size = 16 }: { type?: string | null; size?: number }) {
  const s = size
  if (type === "delivery") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h11M3 12V8h8l3 4M3 12l-1 4h2"/>
      <path d="M14 12l2-4h3l2 4h1v3a1 1 0 0 1-1 1h-1"/>
      <circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/>
      <path d="M8 17h8"/>
    </svg>
  )
  if (type === "service") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  )
  if (type === "room_offer") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
    </svg>
  )
  if (type === "menu_item") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.6"/>
      <path d="M21 3v4h-4M12 7v5l3 3"/>
    </svg>
  )
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
    </svg>
  )
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

function ItemImagesModal({ item, onClose, onUpdate }: {
  item: CatalogItem;
  onClose: () => void;
  onUpdate: (updated: CatalogItem) => void;
}) {
  const { language } = useAppLanguage();
  const tx = (fr: string, en: string) => tLabel(language, { fr, en });
  const [coverUrl, setCoverUrl] = useState(item.imageUrl || "");
  const [savingCover, setSavingCover] = useState(false);
  const [imgUrl, setImgUrl]     = useState("");
  const [imgAlt, setImgAlt]     = useState("");
  const [imgPrimary, setImgPrimary] = useState(false);
  const [adding, setAdding]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState("");
  const [editingAlt, setEditingAlt] = useState("");
  const [editingPrimary, setEditingPrimary] = useState(false);
  const [savingImageId, setSavingImageId] = useState<string | null>(null);
  const [selImageIds, setSelImageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCoverUrl(item.imageUrl || "");
    setSelImageIds(new Set());
    setEditingId(null);
  }, [item]);

  function toggleImageSelection(id: string) {
    setSelImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startEditing(img: CatalogItemImage) {
    setEditingId(img.id);
    setEditingUrl(img.url);
    setEditingAlt(img.altText || "");
    setEditingPrimary(img.isPrimary);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingUrl("");
    setEditingAlt("");
    setEditingPrimary(false);
  }

  async function saveCover(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    setSavingCover(true);
    try {
      const updated = await updateCatalogItem(token, wsId, item.id, {
        image_url: coverUrl.trim() || "",
      });
      onUpdate({
        ...item,
        ...updated,
        images: updated.images.length > 0 ? updated.images : item.images,
      });
      toast.success(tx("Image principale mise à jour.", "Primary image updated."));
    } catch (err) {
      toast.error(apiErr(err, tx));
    } finally {
      setSavingCover(false);
    }
  }

  async function addImage(e: React.FormEvent) {
    e.preventDefault();
    if (!imgUrl.trim()) return;
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    setAdding(true);
    try {
      const img = await addCatalogItemImage(token, wsId, item.id, {
        url: imgUrl.trim(),
        alt_text: imgAlt.trim() || undefined,
        is_primary: imgPrimary,
      });
      const updated: CatalogItem = { ...item, images: [...item.images, img] };
      onUpdate(updated);
      setImgUrl(""); setImgAlt(""); setImgPrimary(false);
      toast.success(tx("Image ajoutée.", "Image added."));
    } catch (err) { toast.error(apiErr(err, tx)); }
    finally { setAdding(false); }
  }

  async function saveImage(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editingUrl.trim()) return;
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    setSavingImageId(editingId);
    try {
      const updatedImage = await updateCatalogItemImage(token, wsId, editingId, {
        url: editingUrl.trim(),
        alt_text: editingAlt.trim() || undefined,
        is_primary: editingPrimary,
      });
      const updated: CatalogItem = {
        ...item,
        images: item.images.map((img) => (img.id === editingId ? updatedImage : img)),
      };
      onUpdate(updated);
      cancelEditing();
      toast.success(tx("Image mise à jour.", "Image updated."));
    } catch (err) {
      toast.error(apiErr(err, tx));
    } finally {
      setSavingImageId(null);
    }
  }

  async function removeImage(img: CatalogItemImage) {
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    setDeletingId(img.id);
    try {
      await deleteCatalogItemImage(token, wsId, img.id);
      const updated: CatalogItem = { ...item, images: item.images.filter(i => i.id !== img.id) };
      onUpdate(updated);
      setSelImageIds(prev => {
        const next = new Set(prev);
        next.delete(img.id);
        return next;
      });
      toast.success(tx("Image supprimée.", "Image deleted."));
    } catch (err) { toast.error(apiErr(err, tx)); }
    finally { setDeletingId(null); }
  }

  async function bulkDeleteImages() {
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId || selImageIds.size === 0) return;
    const ids = [...selImageIds];
    try {
      await bulkDeleteCatalogImages(token, wsId, ids);
      onUpdate({ ...item, images: item.images.filter((img) => !ids.includes(img.id)) });
      setSelImageIds(new Set());
      toast.success(language.startsWith("en") ? `${ids.length} image${ids.length > 1 ? "s" : ""} deleted.` : `${ids.length} image${ids.length > 1 ? "s" : ""} supprimée${ids.length > 1 ? "s" : ""}.`);
    } catch (err) {
      toast.error(apiErr(err, tx));
    }
  }

  return (
    <Modal title={`Images — ${item.name}`} onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-muted/50 p-4">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{tx("Image principale", "Primary image")}</p>
          <form onSubmit={saveCover} className="space-y-3">
            <ImageDropZone value={coverUrl} onChange={setCoverUrl} label={tx("Image de couverture", "Cover image")} />
            <div className="flex justify-end">
              <Button variant="outline" size="sm" type="submit" disabled={savingCover}>{savingCover ? tx("Mise à jour…", "Updating...") : tx("Mettre à jour", "Update")}</Button>
            </div>
          </form>
        </div>

        {item.images.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/50 px-4 py-8 text-center">
            <p className="text-[28px] mb-2">📷</p>
            <p className="text-[14px] text-muted-foreground">{tx("Aucune image pour cet article.", "No image for this item.")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <BulkBar count={selImageIds.size} onDelete={bulkDeleteImages} onClear={() => setSelImageIds(new Set())} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {item.images.map(img => (
              <div key={img.id} className="rounded-xl border border-border bg-muted/50">
                <div className="group relative overflow-hidden rounded-t-xl">
                  <Image
                    src={img.url}
                    alt={img.altText || item.name}
                    width={800}
                    height={224}
                    unoptimized
                    className="h-28 w-full object-cover"
                  />
                  {img.isPrimary && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-card px-2 py-0.5 text-[11.5px] font-semibold text-primary shadow-sm ring-1 ring-primary/20">Principal</span>
                  )}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      onClick={() => removeImage(img)}
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={deletingId === img.id}
                      className="h-6 w-6 rounded-full bg-card/90 text-red-500 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    >
                      {deletingId === img.id ? (
                        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity=".25"/><path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      )}
                    </Button>
                  </div>
                </div>
                {img.altText && (
                  <div className="px-3 pb-2 pt-1.5">
                    <p className="text-[12px] text-muted-foreground">{img.altText}</p>
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{tx("Ajouter une image", "Add an image")}</p>
          <form onSubmit={addImage} className="space-y-3">
            <ImageDropZone value={imgUrl} onChange={setImgUrl} label={tx("Image *", "Image *")} />
            <div><Label>{tx("Description (alt)", "Description (alt)")}</Label><Input value={imgAlt} onChange={e => setImgAlt(e.target.value)} placeholder={tx("Ex : Burger Classic vue de face", "e.g. Classic Burger front view")} /></div>
            <Label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox checked={imgPrimary} onCheckedChange={v => setImgPrimary(!!v)} />
              <span className="text-[14px] text-muted-foreground">{tx("Image principale", "Primary image")}</span>
            </Label>
            <DialogFooter>
              <Button type="submit" disabled={adding || !imgUrl.trim()}>{adding ? tx("Ajout…", "Adding...") : tx("Ajouter", "Add")}</Button>
            </DialogFooter>
          </form>
        </div>
      </div>
    </Modal>
  );
}

// ─── IMAGE DROP ZONE ───────────────────────────────────────────────────────────

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

function buildCategoryCountMap(items: CatalogItem[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    if (!item.categoryId) continue;
    map.set(item.categoryId, (map.get(item.categoryId) ?? 0) + 1);
  }
  return map;
}

function CatalogCategoryManageList({
  categories,
  categoryCounts,
  selCats,
  toggleCategory,
  setActiveCat,
  openCatModal,
  deleteCategory,
  tx,
}: {
  categories: CatalogCategory[];
  categoryCounts: Map<string, number>;
  selCats: Set<string>;
  toggleCategory: (id: string) => void;
  setActiveCat: (id: string) => void;
  openCatModal: (cat?: CatalogCategory) => void;
  deleteCategory: (id: string) => void;
  tx: (fr: string, en: string) => string;
}) {
  return (
    <div className="space-y-2">
      {categories.map((c) => {
        const count = categoryCounts.get(c.id) ?? 0;
        return (
          <div
            key={c.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all ${selCats.has(c.id) ? "border-primary bg-primary/5" : "border-border bg-muted/50"}`}
          >
            <Checkbox checked={selCats.has(c.id)} onCheckedChange={() => toggleCategory(c.id)} className="h-4 w-4 shrink-0" />
            <Button type="button" variant="ghost" onClick={() => setActiveCat(c.id)} className="min-w-0 flex-1 h-auto flex-col items-start px-1 py-0 hover:bg-transparent text-left">
              <p className="truncate text-[13.5px] font-medium text-foreground">{c.name}</p>
              <p className="text-[12px] text-muted-foreground">
                {count} {tx("article", "item")}{count !== 1 ? "s" : ""}
              </p>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => openCatModal(c)}
              title={tx("Modifier", "Edit")}
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10.5 2.5l3 3M2 14h3l8.75-8.75a1.768 1.768 0 000-2.5l-.5-.5a1.768 1.768 0 00-2.5 0L2 11v3z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => deleteCategory(c.id)}
              title={tx("Supprimer", "Delete")}
              className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-red-50 hover:text-red-500"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function CatalogCategoryBandMobile({
  activeCat,
  setActiveCat,
  categories,
  itemsCount,
  categoryCounts,
  showManage,
  onToggleManage,
  tx,
}: {
  activeCat: string;
  setActiveCat: (id: string) => void;
  categories: CatalogCategory[];
  itemsCount: number;
  categoryCounts: Map<string, number>;
  showManage: boolean;
  onToggleManage: () => void;
  tx: (fr: string, en: string) => string;
}) {
  const chipClass = (active: boolean) =>
    `snap-start shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13.5px] font-medium transition-all duration-150 ${
      active
        ? "border-primary bg-primary text-primary-foreground shadow-[0_2px_10px_rgba(255,204,0,0.25)]"
        : "border-border bg-card text-muted-foreground active:scale-[0.98]"
    }`;

  const countBadgeClass = (active: boolean) =>
    `rounded-full px-1.5 py-0.5 text-[11.5px] font-semibold leading-none ${
      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
    }`;

  return (
    <div className="sm:hidden">
      <div className="relative -mx-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background to-transparent" />
        <div
          role="tablist"
          aria-label={tx("Catégories du catalogue", "Catalog categories")}
          className="flex gap-2 overflow-x-auto overscroll-x-contain scroll-smooth px-4 py-0.5 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        >
          <Button
            type="button"
            role="tab"
            aria-selected={activeCat === "all"}
            onClick={() => setActiveCat("all")}
            className={chipClass(activeCat === "all")}
          >
            {tx("Tous", "All")}
            <span className={countBadgeClass(activeCat === "all")}>{itemsCount}</span>
          </Button>
          {categories.map((c) => {
            const count = categoryCounts.get(c.id) ?? 0;
            const active = activeCat === c.id;
            return (
              <Button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCat(c.id)}
                className={chipClass(active)}
              >
                <span className="max-w-[120px] truncate">{c.name}</span>
                <span className={countBadgeClass(active)}>{count}</span>
              </Button>
            );
          })}
          {categories.length > 0 ? (
            <Button
              type="button"
              onClick={onToggleManage}
              aria-expanded={showManage}
              className={`snap-start shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13.5px] font-medium transition-all duration-150 ${
                showManage
                  ? "border-border bg-muted text-foreground"
                  : "border-dashed border-border bg-card text-muted-foreground active:scale-[0.98]"
              }`}
            >
              <Icon name="tag" size={14} className="shrink-0" />
              {tx("Gérer", "Manage")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CategoryCombobox({ categories, value, onChange, tx }: {
  categories: CatalogCategory[];
  value: string;
  onChange: (id: string, isNew?: boolean, name?: string) => void;
  tx: (fr: string, en: string) => string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const selected = categories.find(c => c.id === value);
  const filtered = query.trim() ? categories.filter(c => c.name.toLowerCase().includes(query.toLowerCase())) : categories;
  const exactMatch = categories.some(c => c.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open}
          className="w-full justify-between font-normal text-[14px] h-9">
          {selected?.name || <span className="text-muted-foreground">{tx("Rechercher ou créer une catégorie", "Search or create a category")}</span>}
          <svg className="ml-2 shrink-0 opacity-50" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command>
          <CommandInput placeholder={tx("Rechercher…", "Search…")} value={query} onValueChange={setQuery} />
          <CommandList>
            {filtered.length === 0 && !query.trim() && (
              <CommandEmpty>{tx("Aucune catégorie", "No category")}</CommandEmpty>
            )}
            <CommandGroup>
              {filtered.map(c => (
                <CommandItem key={c.id} value={c.name} onSelect={() => { onChange(c.id); setOpen(false); setQuery(""); }}
                  className={cn(c.id === value && "font-medium text-primary")}>
                  <svg className={cn("mr-2 shrink-0", c.id === value ? "opacity-100" : "opacity-0")} width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
            {query.trim() && !exactMatch && (
              <CommandGroup>
                <CommandItem value={`__create__${query.trim()}`}
                  onSelect={() => { onChange("__new__", true, query.trim()); setOpen(false); setQuery(""); }}
                  className="text-primary">
                  <svg className="mr-2 shrink-0" width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  {tx(`Créer "${query.trim()}"`, `Create "${query.trim()}"`)}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ZoneCombobox({ zones, value, onChange, tx }: {
  zones: DeliveryZone[];
  value: string;
  onChange: (id: string, isNew?: boolean, name?: string) => void;
  tx: (fr: string, en: string) => string;
}) {
  const [q, setQ]       = useState("");
  const [open, setOpen] = useState(false);
  const selected = zones.find(z => z.id === value);
  const filtered = q.trim() ? zones.filter(z => z.name.toLowerCase().includes(q.toLowerCase())) : zones;
  const exactMatch = zones.some(z => z.name.toLowerCase() === q.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open}
          className="w-full justify-between font-normal text-[14px] h-9">
          {selected ? (
            <span className="flex items-center gap-1.5">
              {selected.name}
              {(selected.city || selected.district) && (
                <span className="text-[12px] text-muted-foreground">{[selected.city, selected.district].filter(Boolean).join(", ")}</span>
              )}
            </span>
          ) : <span className="text-muted-foreground">{tx("Rechercher ou créer une zone", "Search or create a zone")}</span>}
          <svg className="ml-2 shrink-0 opacity-50" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command>
          <CommandInput placeholder={tx("Rechercher…", "Search…")} value={q} onValueChange={setQ} />
          <CommandList>
            {filtered.length === 0 && !q.trim() && (
              <CommandEmpty>{tx("Aucune zone", "No zone")}</CommandEmpty>
            )}
            <CommandGroup>
              {filtered.map(z => (
                <CommandItem key={z.id} value={z.name} onSelect={() => { onChange(z.id); setOpen(false); setQ(""); }}
                  className={cn(z.id === value && "font-medium text-primary")}>
                  <svg className={cn("mr-2 shrink-0", z.id === value ? "opacity-100" : "opacity-0")} width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {z.name}
                  {(z.city || z.district) && <span className="ml-1 text-[12px] text-muted-foreground">{[z.city, z.district].filter(Boolean).join(", ")}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
            {q.trim() && !exactMatch && (
              <CommandGroup>
                <CommandItem value={`__create__${q.trim()}`}
                  onSelect={() => { onChange("__new__", true, q.trim()); setOpen(false); setQ(""); }}
                  className="text-primary">
                  <svg className="mr-2 shrink-0" width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  {tx(`Créer "${q.trim()}"`, `Create "${q.trim()}"`)}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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

function CatHeaderMenu({ onCategories, onZones, onImport, onExport, canExport, tx }: {
  onCategories: () => void;
  onZones: () => void;
  onImport: () => void;
  onExport: () => void;
  canExport: boolean;
  tx: (fr: string, en: string) => string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden h-9 w-9" title={tx("Plus d'options", "More options")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onCategories} className="gap-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          {tx("Catégories", "Categories")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onZones} className="gap-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          {tx("Zones de livraison", "Delivery zones")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onImport} className="gap-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {tx("Importer", "Import")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExport} disabled={!canExport} className="gap-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {tx("Exporter", "Export")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export function CatalogueTab() {
  const { language } = useAppLanguage();
  const tx = useCallback((fr: string, en: string) => tLabel(language, { fr, en }), [language]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [items, setItems]           = useState<CatalogItem[]>([]);
  const [zones, setZones]           = useState<DeliveryZone[]>([]);
  const [loading, setLoading]       = useState(true);
  const [catalogView, setCatalogView] = useState<"list" | "form">("list");
  const [activeCat, setActiveCat]   = useState("all");
  const [showCatModal, setShowCatModal]   = useState(false);
  const [imageItem, setImageItem]   = useState<CatalogItem | null>(null);
  const [editingCat, setEditingCat] = useState<CatalogCategory | null>(null);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [saving, setSaving]         = useState(false);
  const [selCats, setSelCats]       = useState<Set<string>>(new Set());
  const [selItems, setSelItems]     = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toggling, setToggling]     = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [page, setPage] = useState(1);
  const [catSearch, setCatSearch] = useState("");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filterVisibility, setFilterVisibility] = useState<"all" | "active" | "inactive">("all");
  const [filterType, setFilterType] = useState("all");
  const [filterZone, setFilterZone] = useState("all");
  const [catSortKey, setCatSortKey] = useState<"name" | "price" | "type">("name");
  const [catSortDir, setCatSortDir] = useState<"asc" | "desc">("asc");

  // Store link
  const [storeToken, setStoreToken]       = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [showStoreLink, setShowStoreLink] = useState(false);
  const [storeLinkCopied, setStoreLinkCopied] = useState(false);

  const storeUrl = storeToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/store/${storeToken}`
    : null;

  async function generateStoreLink() {
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    setGeneratingLink(true);
    try {
      const data = await apiRequest<{ success: boolean; data: { store_token: string } }>(
        `/app/workspaces/${wsId}/business/store-token`,
        { method: "POST", token }
      );
      if (data.success) {
        setStoreToken(data.data.store_token);
        setShowStoreLink(true);
        setStoreLinkCopied(false);
      }
    } catch {
      toast.error(tx("Impossible de générer le lien boutique.", "Failed to generate store link."));
    } finally {
      setGeneratingLink(false);
    }
  }

  function copyStoreLink() {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl);
    setStoreLinkCopied(true);
    setTimeout(() => setStoreLinkCopied(false), 2000);
  }

  // Drawers gestion
  const [showCatDrawer, setShowCatDrawer]   = useState(false);
  const [showZoneDrawer, setShowZoneDrawer] = useState(false);
  const [pendingDeleteZoneId, setPendingDeleteZoneId] = useState<string | null>(null);
  const [showBulkItemsConfirm, setShowBulkItemsConfirm] = useState(false);
  const [showBulkCatsConfirm, setShowBulkCatsConfirm]   = useState(false);

  // Zone modal state
  const [editingZone, setEditingZone]   = useState<DeliveryZone | null>(null);
  const [zoneName, setZoneName]         = useState("");
  const [zoneCity, setZoneCity]         = useState("");
  const [zoneDistrict, setZoneDistrict] = useState("");
  const [zoneActive, setZoneActive]     = useState(true);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [savingZone, setSavingZone]       = useState(false);

  const hasActiveFilters = catSearch !== "" || filterVisibility !== "all" || filterType !== "all" || activeCat !== "all" || filterZone !== "all";

  function resetAllFilters() {
    setCatSearch(""); setActiveCat("all"); setFilterVisibility("all"); setFilterType("all"); setFilterZone("all"); setPage(1);
  }

  function handleCatSort(key: "name" | "price" | "type") {
    if (catSortKey === key) setCatSortDir(d => d === "asc" ? "desc" : "asc");
    else { setCatSortKey(key); setCatSortDir("asc"); }
  }

  useEffect(() => { setPage(1); }, [activeCat]);
  useEffect(() => { setPage(1); }, [catSearch, filterVisibility, filterType]);

  function exportCsv() {
    const rows: string[][] = [["Nom", "Catégorie", "Prix", "Devise", "SKU", "Type", "Description", "Statut"]];
    for (const item of items) {
      rows.push([item.name, item.categoryName || "", String(item.basePrice || 0), item.currency || "XOF", item.sku || "", item.itemType || "product", item.description || "", item.availabilityStatus || "available"]);
    }
    downloadCsv(rows, "catalogue-articles.csv");
  }

  async function onImportItems(rows: Record<string, string>[]) {
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;

    const payloadItems = rows
      .filter(row => row.name)
      .map((row, index) => {
        const item: Record<string, unknown> = {
          name: row.name,
          item_type: row.type || "product",
          sku: row.sku || `item-${Date.now()}-${index}`,
          base_price: parseFloat(row.price) || 0,
          currency: row.currency || "XOF",
          description: row.description || undefined,
          availability_status: row.status || "available",
          is_active: true,
        };
        if (row.category) item.category_name = row.category;
        return item;
      });

    if (payloadItems.length === 0) {
      toast.error(tx("Aucun article valide a importer.", "No valid item to import."));
      return;
    }

    const result = await importCatalogData(token, wsId, {
      items: payloadItems,
    } satisfies ImportCatalogPayload);

    const [cats, its] = await Promise.all([
      listCatalogCategories(token, wsId),
      listCatalogItems(token, wsId),
    ]);
    setCategories(cats);
    setItems(its);

    toast.success(
      tx(
        `${result.items} article${result.items !== 1 ? "s" : ""} importe${result.items !== 1 ? "s" : ""}${result.categories > 0 ? `, ${result.categories} categorie${result.categories !== 1 ? "s" : ""} creee${result.categories !== 1 ? "s" : ""}` : ""}.`,
        `${result.items} item${result.items !== 1 ? "s" : ""} imported${result.categories > 0 ? `, ${result.categories} categor${result.categories !== 1 ? "ies" : "y"} created` : ""}.`
      )
    );
  }

  function toggleCategory(id: string) {
    setSelCats(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  function toggleItem(id: string) {
    setSelItems(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  async function deleteItem(id: string) {
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    setDeletingId(id);
    try {
      await deleteCatalogItem(token, wsId, id);
      setItems(p => p.filter(i => i.id !== id));
      setSelItems(prev => { const s = new Set(prev); s.delete(id); return s; });
      toast.success(tx("Article supprimé.", "Item deleted."));
    } catch (err) { toast.error(apiErr(err, tx)); }
    finally { setDeletingId(null); }
  }

  async function deleteCategory(id: string) {
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    try {
      await deleteCatalogCategory(token, wsId, id);
      setCategories(p => p.filter(c => c.id !== id));
      setSelCats(prev => { const s = new Set(prev); s.delete(id); return s; });
      if (activeCat === id) setActiveCat("all");
      toast.success(tx("Catégorie supprimée.", "Category deleted."));
    } catch (err) { toast.error(apiErr(err, tx)); }
  }

  function openZoneModal(zone?: DeliveryZone) {
    setEditingZone(zone || null);
    setZoneName(zone?.name || "");
    setZoneCity(zone?.city || "");
    setZoneDistrict(zone?.district || "");
    setZoneActive(zone?.isActive ?? true);
    setShowZoneModal(true);
  }

  async function saveZone(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId || !zoneName.trim()) return;
    setSavingZone(true);
    try {
      const payload = { name: zoneName.trim(), city: zoneCity.trim() || undefined, district: zoneDistrict.trim() || undefined, is_active: zoneActive };
      if (editingZone) {
        const updated = await updateDeliveryZone(token, wsId, editingZone.id, payload);
        setZones(p => p.map(z => z.id === updated.id ? updated : z));
        toast.success(tx("Zone mise à jour.", "Zone updated."));
      } else {
        const created = await createDeliveryZone(token, wsId, { ...payload, is_active: zoneActive });
        setZones(p => [...p, created]);
        toast.success(tx("Zone créée.", "Zone created."));
      }
      setShowZoneModal(false);
    } catch (err) { toast.error(apiErr(err, tx)); }
    finally { setSavingZone(false); }
  }

  function deleteZone(id: string) {
    setPendingDeleteZoneId(id);
  }

  async function confirmDeleteZone() {
    if (!pendingDeleteZoneId) return;
    const id = pendingDeleteZoneId;
    setPendingDeleteZoneId(null);
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    try {
      await deleteDeliveryZone(token, wsId, id);
      setZones(p => p.filter(z => z.id !== id));
      toast.success(tx("Zone supprimée.", "Zone deleted."));
    } catch (err) { toast.error(apiErr(err, tx)); }
  }

  function bulkDeleteCategories() {
    if (selCats.size === 0) return;
    setShowBulkCatsConfirm(true);
  }

  async function confirmBulkDeleteCategories() {
    setShowBulkCatsConfirm(false);
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId || selCats.size === 0) return;
    const ids = [...selCats];
    try {
      await bulkDeleteCatalogCategories(token, wsId, ids);
      setCategories(p => p.filter(c => !ids.includes(c.id)));
      setItems(p => p.filter(i => !i.categoryId || !ids.includes(i.categoryId)));
      setSelCats(new Set());
      if (ids.includes(activeCat)) setActiveCat("all");
      toast.success(`${ids.length} catégorie${ids.length > 1 ? "s" : ""} supprimée${ids.length > 1 ? "s" : ""}.`);
    } catch (err) { toast.error(apiErr(err, tx)); }
  }

  function bulkDeleteItems() {
    if (selItems.size === 0) return;
    setShowBulkItemsConfirm(true);
  }

  async function confirmBulkDeleteItems() {
    setShowBulkItemsConfirm(false);
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId || selItems.size === 0) return;
    const ids = [...selItems];
    try {
      await bulkDeleteCatalogItems(token, wsId, ids);
      setItems(p => p.filter(i => !ids.includes(i.id)));
      setSelItems(new Set());
      toast.success(`${ids.length} article${ids.length > 1 ? "s" : ""} supprimé${ids.length > 1 ? "s" : ""}.`);
    } catch (err) { toast.error(apiErr(err, tx)); }
  }

  const [catName, setCatName]   = useState("");
  const [catDesc, setCatDesc]   = useState("");
  const [catActive, setCatActive] = useState(true);

  const [itemName, setItemName]                   = useState("");
  const [itemCatId, setItemCatId]                 = useState("");
  const [itemType, setItemType]                   = useState("product");
  const [itemSku, setItemSku]                     = useState("");
  const [skuCustom, setSkuCustom]                 = useState(false);
  const [itemPrice, setItemPrice]                 = useState("0");
  const [itemOriginalPrice, setItemOriginalPrice] = useState("");
  const [itemCurrency, setItemCurrency]           = useState("XOF");
  const [itemDesc, setItemDesc]                   = useState("");
  const [itemImgUrl, setItemImgUrl]               = useState("");
  const [itemExtraImgUrls, setItemExtraImgUrls]   = useState<string[]>([]);
  const [itemStatus, setItemStatus]               = useState("available");
  const [itemActive, setItemActive]               = useState(true);

  // Physique
  const [cfStock, setCfStock]               = useState("");
  const [cfWeight, setCfWeight]             = useState("");
  const [cfSupplierRef, setCfSupplierRef]   = useState("");
  // Numérique
  const [cfFileUrl, setCfFileUrl]           = useState("");
  const [cfFileFormat, setCfFileFormat]     = useState("");
  // Créneau / RDV
  const [cfDuration, setCfDuration]         = useState("60");
  const [cfModality, setCfModality]         = useState("on_site");
  const [cfMeetLink, setCfMeetLink]         = useState("");
  const [cfSlotDate, setCfSlotDate]         = useState<Date | undefined>(undefined);
  const [cfSlotHour, setCfSlotHour]         = useState("09");
  const [cfSlotMinute, setCfSlotMinute]     = useState("00");
  const [cfSlotEndHour, setCfSlotEndHour]   = useState("10");
  const [cfSlotEndMinute, setCfSlotEndMinute] = useState("00");
  const [cfBookingMode, setCfBookingMode]     = useState<"fixed" | "libre">("fixed");
  const [cfPricingUnit, setCfPricingUnit]     = useState<"per_day" | "per_hour">("per_day");
  // Abonnement
  const [cfFrequency, setCfFrequency]       = useState("monthly");
  const [cfDurationMonths, setCfDurationMonths] = useState("");
  // Livraison
  const [cfZoneId, setCfZoneId]             = useState("");
  const [cfPricingType, setCfPricingType]   = useState("flat");
  const [cfDelay, setCfDelay]               = useState("same_day");
  const [itemErrors, setItemErrors]         = useState<{ name?: string; price?: string; category?: string }>({});

  useEffect(() => {
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    let ok = true; setLoading(true);
    // Load existing store token silently (no generation)
    apiRequest<{ success: boolean; data: { store_token: string | null } }>(
      `/app/workspaces/${wsId}/business/store-token`,
      { method: "GET", token }
    ).then(d => { if (ok && d.success && d.data.store_token) setStoreToken(d.data.store_token); }).catch(() => {});
    Promise.all([listCatalogCategories(token, wsId), listCatalogItems(token, wsId), listDeliveryZones(token, wsId)])
      .then(([cats, its, zns]) => { if (ok) { setCategories(cats); setItems(its); setZones(zns); } })
      .catch(() => { if (ok) toast.error(tx("Impossible de charger le catalogue.", "Unable to load the catalog.")); })
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [tx]);

  function resetCustomFields() {
    setCfStock(""); setCfWeight(""); setCfSupplierRef("");
    setCfFileUrl(""); setCfFileFormat("");
    setCfDuration("60"); setCfModality("on_site"); setCfMeetLink(""); setCfSlotDate(undefined); setCfSlotHour("09"); setCfSlotMinute("00"); setCfSlotEndHour("10"); setCfSlotEndMinute("00");
    setCfBookingMode("fixed");
    setCfFrequency("monthly"); setCfDurationMonths("");
    setCfZoneId(""); setCfPricingType("flat"); setCfDelay("same_day");
  }

  function restoreCustomFields(cf: Record<string, unknown>) {
    const s = (k: string) => cf[k] != null ? String(cf[k]) : "";
    setCfStock(s("stock")); setCfWeight(s("weight")); setCfSupplierRef(s("supplier_ref"));
    setCfFileUrl(s("file_url")); setCfFileFormat(s("file_format"));
    setCfDuration(s("duration") || "60"); setCfModality(s("modality") || "on_site"); setCfMeetLink(s("meet_link"));
    const sd = s("slot_date"); setCfSlotDate(sd ? new Date(sd) : undefined);
    const st = s("slot_time"); setCfSlotHour(st ? st.split(":")[0] : "09"); setCfSlotMinute(st ? st.split(":")[1] : "00");
    const et = s("slot_end_time"); setCfSlotEndHour(et ? et.split(":")[0] : "10"); setCfSlotEndMinute(et ? et.split(":")[1] : "00");
    setCfBookingMode(((cf["booking_mode"] as string) === "libre" ? "libre" : "fixed"));
    setCfPricingUnit(((cf["pricing_unit"] as string) === "per_hour" ? "per_hour" : "per_day"));
    setCfFrequency(s("frequency") || "monthly"); setCfDurationMonths(s("duration_months"));
    setCfZoneId(s("zone_id")); setCfPricingType(s("pricing_type") || "flat"); setCfDelay(s("delay") || "same_day");
  }

  function buildCustomFields() {
    const base: Record<string, unknown> = {};
    const op = parseFloat(itemOriginalPrice);
    if (!isNaN(op) && itemOriginalPrice.trim()) base.original_price = op;
    if (itemType === "product") {
      if (cfStock.trim())       base.stock        = parseInt(cfStock) || 0;
      if (cfWeight.trim())      base.weight       = parseFloat(cfWeight) || 0;
      if (cfSupplierRef.trim()) base.supplier_ref = cfSupplierRef.trim();
    } else if (itemType === "service") {
      if (cfFileUrl.trim())    base.file_url    = cfFileUrl.trim();
      if (cfFileFormat.trim()) base.file_format = cfFileFormat.trim();
    } else if (itemType === "room_offer") {
      base.duration = cfDuration;
      base.modality = cfModality;
      base.booking_mode = cfBookingMode;
      if (cfModality === "online" && cfMeetLink.trim()) base.meet_link = cfMeetLink.trim();
      if (cfBookingMode === "libre") {
        base.pricing_unit = cfPricingUnit;
      }
      if (cfBookingMode === "fixed") {
        if (cfSlotDate) base.slot_date = cfSlotDate.toISOString();
        base.slot_time = `${cfSlotHour}:${cfSlotMinute}`;
        base.slot_end_time = `${cfSlotEndHour}:${cfSlotEndMinute}`;
      }
    } else if (itemType === "menu_item") {
      base.frequency = cfFrequency;
      if (cfDurationMonths.trim()) base.duration_months = parseInt(cfDurationMonths) || 0;
    } else if (itemType === "delivery") {
      if (cfZoneId) base.zone_id = cfZoneId;
      base.pricing_type = cfPricingType;
      base.delay        = cfDelay;
    }
    return Object.keys(base).length > 0 ? base : undefined;
  }

  function openCatModal(cat?: CatalogCategory) {
    setEditingCat(cat || null);
    setCatName(cat?.name || "");
    setCatDesc(cat?.description || "");
    setCatActive(cat?.isActive ?? true);
    setShowCatModal(true);
  }

  function openCreateForm() {
    setEditingItem(null);
    setItemName(""); setItemCatId(categories[0]?.id || "");
    setItemType("product"); setItemSku(""); setSkuCustom(false);
    setItemPrice("0"); setItemOriginalPrice("");
    setItemCurrency("XOF"); setItemDesc("");
    setItemImgUrl(""); setItemExtraImgUrls([]);
    setItemStatus("available"); setItemActive(true);
    resetCustomFields(); setItemErrors({});
    setCatalogView("form");
  }

  function openEditForm(item: CatalogItem) {
    setEditingItem(item);
    setItemName(item.name); setItemCatId(item.categoryId || "");
    setItemType(item.itemType || "product"); setItemSku(item.sku || ""); setSkuCustom(!!item.sku);
    setItemPrice(String(item.basePrice ?? 0));
    setItemOriginalPrice(item.customFields?.original_price != null ? String(item.customFields.original_price) : "");
    setItemCurrency(item.currency || "XOF"); setItemDesc(item.description || "");
    const sortedImgs = [...(item.images || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    setItemImgUrl(item.imageUrl || sortedImgs[0]?.url || "");
    setItemExtraImgUrls(sortedImgs.slice(1).map(img => img.url));
    setItemStatus(item.availabilityStatus || "available"); setItemActive(item.isActive ?? true);
    resetCustomFields(); setItemErrors({});
    if (item.customFields) restoreCustomFields(item.customFields);
    setCatalogView("form");
  }

  async function toggleVisible(item: CatalogItem) {
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    setToggling(item.id + "_v");
    try {
      const updated = await updateCatalogItem(token, wsId, item.id, { is_active: !item.isActive });
      setItems(p => p.map(i => i.id === updated.id ? updated : i));
    } catch (err) { toast.error(apiErr(err, tx)); }
    finally { setToggling(null); }
  }

  async function toggleEpuise(item: CatalogItem) {
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    setToggling(item.id + "_e");
    const newStatus = item.availabilityStatus === "unavailable" ? "available" : "unavailable";
    try {
      const updated = await updateCatalogItem(token, wsId, item.id, { availability_status: newStatus });
      setItems(p => p.map(i => i.id === updated.id ? updated : i));
    } catch (err) { toast.error(apiErr(err, tx)); }
    finally { setToggling(null); }
  }

  async function handleCategoryChange(id: string, isNew?: boolean, name?: string) {
    if (isNew && name) {
      const token = getToken(); const wsId = getActiveWorkspaceId();
      if (!token || !wsId) return;
      try {
        const cat = await createCatalogCategory(token, wsId, { name, is_active: true });
        setCategories(p => [...p, cat]);
        setItemCatId(cat.id);
      } catch { toast.error(tx("Erreur lors de la création.", "Creation error.")); }
    } else {
      setItemCatId(id);
    }
  }

  async function saveCat(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    setSaving(true);
    try {
      if (editingCat) {
        const cat = await updateCatalogCategory(token, wsId, editingCat.id, {
          name: catName.trim(),
          description: catDesc.trim() || undefined,
          is_active: catActive,
        });
        setCategories(p => p.map(c => c.id === cat.id ? cat : c));
        toast.success(tx("Catégorie mise à jour.", "Category updated."));
      } else {
        const cat = await createCatalogCategory(token, wsId, {
          name: catName.trim(),
          description: catDesc.trim() || undefined,
          is_active: catActive,
        });
        setCategories(p => [cat, ...p]);
        toast.success(tx("Catégorie créée.", "Category created."));
      }
      setShowCatModal(false);
      setEditingCat(null);
    } catch (err) { toast.error(apiErr(err, tx)); }
    finally { setSaving(false); }
  }

  function validateItem() {
    const errs: { name?: string; price?: string; category?: string } = {};
    if (!itemName.trim()) errs.name = tx("Le nom est requis.", "Name is required.");
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price < 0) errs.price = tx("Le prix doit être ≥ 0.", "Price must be ≥ 0.");
    if (!itemCatId && itemType !== "delivery") errs.category = tx("Sélectionnez une catégorie.", "Select a category.");
    return errs;
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken(); const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    const errs = validateItem();
    if (Object.keys(errs).length > 0) { setItemErrors(errs); return; }
    setItemErrors({});
    setSaving(true);
    try {
      const customFields = buildCustomFields();

      if (editingItem) {
        const item = await updateCatalogItem(token, wsId, editingItem.id, {
          name: itemName.trim(),
          category_id: itemCatId || undefined,
          item_type: itemType || undefined,
          sku: itemSku.trim() || undefined,
          base_price: parseFloat(itemPrice) || 0,
          currency: itemCurrency.trim() || "XOF",
          description: itemDesc.trim() || undefined,
          image_url: itemImgUrl.trim() || undefined,
          availability_status: itemStatus,
          is_active: itemActive,
          custom_fields: customFields,
        });
        // Sync extra images: remove deleted ones, add new ones
        const prevSorted = [...(editingItem.images || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const prevExtra = prevSorted.slice(1);
        const newExtra = itemExtraImgUrls.filter(u => u.trim());
        for (const prev of prevExtra) {
          if (!newExtra.includes(prev.url)) {
            await deleteCatalogItemImage(token, wsId, prev.id).catch(() => {});
          }
        }
        const prevUrls = new Set(prevExtra.map(i => i.url));
        for (let i = 0; i < newExtra.length; i++) {
          if (!prevUrls.has(newExtra[i])) {
            await addCatalogItemImage(token, wsId, editingItem.id, { url: newExtra[i], sort_order: i + 1 });
          }
        }
        setItems(p => p.map(i => i.id === item.id ? item : i));
        toast.success(tx("Article mis à jour.", "Item updated."));
      } else {
        const item = await createCatalogItem(token, wsId, {
          name: itemName.trim(),
          category_id: itemCatId,
          item_type: itemType,
          sku: itemSku.trim() || `item-${Date.now()}`,
          base_price: parseFloat(itemPrice) || 0,
          currency: itemCurrency.trim() || "XOF",
          description: itemDesc.trim() || undefined,
          image_url: itemImgUrl.trim() || undefined,
          availability_status: itemStatus,
          is_active: itemActive,
          custom_fields: customFields,
        });
        const extraUrls = itemExtraImgUrls.filter(u => u.trim());
        for (let i = 0; i < extraUrls.length; i++) {
          await addCatalogItemImage(token, wsId, item.id, { url: extraUrls[i].trim(), sort_order: i + 1 });
        }
        setItems(p => [item, ...p]);
        toast.success(tx("Article ajouté.", "Item added."));
      }
      setCatalogView("list");
      setEditingItem(null);
    } catch (err) { toast.error(apiErr(err, tx)); }
    finally { setSaving(false); }
  }

  const filtered = useMemo(() => {
    let list = activeCat === "all" ? items : items.filter(i => i.categoryId === activeCat);
    if (catSearch) {
      const q = catSearch.toLowerCase();
      list = list.filter(i => [i.name, i.description, i.sku, i.categoryName].some(v => v?.toLowerCase().includes(q)));
    }
    if (filterVisibility === "active")   list = list.filter(i => i.isActive);
    if (filterVisibility === "inactive") list = list.filter(i => !i.isActive);
    if (filterType !== "all") list = list.filter(i => (i.itemType || "product") === filterType);
    if (filterZone !== "all") list = list.filter(i => (i.customFields as Record<string, string> | undefined)?.zone_id === filterZone);
    list = [...list].sort((a, b) => {
      let av: string | number = "", bv: string | number = "";
      if (catSortKey === "price") { av = a.basePrice ?? 0; bv = b.basePrice ?? 0; }
      else if (catSortKey === "type") { av = a.itemType || ""; bv = b.itemType || ""; }
      else { av = a.name?.toLowerCase() || ""; bv = b.name?.toLowerCase() || ""; }
      if (av < bv) return catSortDir === "asc" ? -1 : 1;
      if (av > bv) return catSortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [items, activeCat, catSearch, filterVisibility, filterType, catSortKey, catSortDir]);
  const pagedItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const categoryCounts = useMemo(() => buildCategoryCountMap(items), [items]);

  const categoryOptions = useMemo(
    () => [
      {
        value: "all",
        label: `${tx("Tous les articles", "All items")} (${items.length})`,
        icon: "business" as IconName,
      },
      ...categories.map((c) => ({
        value: c.id,
        label: `${c.name} (${categoryCounts.get(c.id) ?? 0})`,
        icon: "tag" as IconName,
      })),
    ],
    [categories, categoryCounts, items.length, tx],
  );

  if (catalogView === "form") {
    return (
      <div>
        <div className="mb-5 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setCatalogView("list")}
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground sm:h-8 sm:w-8"
            aria-label={tx("Retour", "Back")}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Button>
          <div>
            <h2 className="text-[16px] font-semibold text-foreground">
              {editingItem ? tx("Modifier l'article", "Edit item") : tx("Nouvel article", "New item")}
            </h2>
            <p className="text-[13.5px] text-muted-foreground">{tx("Remplissez les informations ci-dessous", "Fill in the information below")}</p>
          </div>
        </div>

        <form onSubmit={saveItem}>
          <div className="grid gap-5 lg:grid-cols-[1fr_268px]">
            {/* Left column */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label>{tx("Nom de l'article", "Item name")} *</Label>
                  <Input
                    required
                    maxLength={200}
                    value={itemName}
                    onChange={e => { setItemName(e.target.value); if (itemErrors.name) setItemErrors(p => ({ ...p, name: undefined })); }}
                    onBlur={() => { if (!itemName.trim()) setItemErrors(p => ({ ...p, name: tx("Le nom est requis.", "Name is required.") })); }}
                    placeholder={tx("Ex : Burger Classic", "e.g. Classic Burger")}
                  />
                  {itemErrors.name && <p className="text-[12px] text-red-500">{itemErrors.name}</p>}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{tx("Type", "Type")}</Label>
                    <Select value={itemType} onValueChange={setItemType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    {itemType === "delivery" ? (
                      <>
                        <Label>{tx("Zone de livraison", "Delivery zone")}</Label>
                        <ZoneCombobox zones={zones} value={cfZoneId} onChange={async (id, isNew, name) => {
                          if (isNew && name) {
                            const token = getToken(); const wsId = getActiveWorkspaceId();
                            if (!token || !wsId) return;
                            try {
                              const z = await createDeliveryZone(token, wsId, { name, is_active: true });
                              setZones(p => [...p, z]);
                              setCfZoneId(z.id);
                            } catch { toast.error(tx("Erreur lors de la création.", "Creation error.")); }
                          } else { setCfZoneId(id); }
                        }} tx={tx} />
                      </>
                    ) : (
                      <>
                        <Label>{tx("Catégorie", "Category")} *</Label>
                        <CategoryCombobox
                          categories={categories}
                          value={itemCatId}
                          onChange={(id, isNew, name) => {
                            handleCategoryChange(id, isNew, name);
                            if (id || isNew) setItemErrors(p => ({ ...p, category: undefined }));
                          }}
                          tx={tx}
                        />
                        {itemErrors.category && <p className="text-[12px] text-red-500">{itemErrors.category}</p>}
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{tx("Prix", "Price")} *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={itemPrice}
                      onChange={e => { setItemPrice(e.target.value); if (itemErrors.price) setItemErrors(p => ({ ...p, price: undefined })); }}
                      onBlur={() => {
                        const v = parseFloat(itemPrice);
                        if (isNaN(v) || v < 0) setItemErrors(p => ({ ...p, price: tx("Le prix doit être ≥ 0.", "Price must be ≥ 0.") }));
                      }}
                      placeholder="0"
                    />
                    {itemErrors.price && <p className="text-[12px] text-red-500">{itemErrors.price}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>{tx("Prix original (barré)", "Original price (strikethrough)")}</Label>
                    <Input type="number" min="0" step="any" value={itemOriginalPrice} onChange={e => setItemOriginalPrice(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{tx("Devise", "Currency")}</Label>
                    <Input value={itemCurrency} onChange={e => setItemCurrency(e.target.value)} placeholder="XOF" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>SKU</Label>
                    <Label className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox
                        checked={!skuCustom}
                        onCheckedChange={v => { setSkuCustom(!v); if (v) setItemSku(""); }}
                      />
                      <span className="text-[13.5px] text-muted-foreground">{tx("Généré automatiquement", "Auto-generated")}</span>
                    </Label>
                    {skuCustom && (
                      <Input
                        value={itemSku}
                        onChange={e => setItemSku(e.target.value)}
                        placeholder="SKU-001"
                        maxLength={100}
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{tx("Description", "Description")}</Label>
                  <Textarea value={itemDesc} onChange={e => setItemDesc(e.target.value)} rows={3} maxLength={2000} placeholder={tx("Décrivez l'article…", "Describe the item…")} />
                </div>
              </div>

              {/* ── Champs dynamiques par type ── */}
              {(itemType === "product" || itemType === "service" || itemType === "room_offer" || itemType === "menu_item" || itemType === "delivery") && (() => {
                const pill = (val: string, cur: string, set: (v: string) => void, label: string) => (
                  <Button key={val} type="button" onClick={() => set(val)}
                    className={`rounded-lg border px-3 py-1.5 text-[13.5px] font-medium transition-colors ${cur === val ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground hover:border-border hover:bg-muted/50"}`}>
                    {label}
                  </Button>
                );
                return (
                  <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                    <h3 className={`${FORM_HEAD} flex items-center`}>
                      {itemType === "product"    ? tx("Stock", "Stock")
                      : itemType === "service"   ? tx("Accès", "Access")
                      : itemType === "room_offer" ? tx("Créneau / RDV", "Slot / Appointment")
                      : itemType === "menu_item"  ? tx("Forfait récurrent", "Recurring plan")
                      : tx("Livraison", "Delivery")}
                      {itemType === "room_offer" && (
                        <Hint text={tx(
                          "Permettez à vos clients de réserver un créneau horaire ou un rendez-vous.",
                          "Let your customers book a time slot or appointment."
                        )} />
                      )}
                    </h3>

                    {itemType === "product" && (
                      <div className="space-y-1.5">
                        <Label>{tx("Stock disponible", "Available stock")}</Label>
                        <Input type="number" min="0" value={cfStock} onChange={e => setCfStock(e.target.value)} placeholder="0" />
                      </div>
                    )}

                    {itemType === "service" && (
                      <div className="space-y-1.5">
                        <Label>{tx("Lien d'accès", "Access link")}</Label>
                        <Input value={cfFileUrl} onChange={e => setCfFileUrl(e.target.value)} placeholder="https://..." />
                      </div>
                    )}

                    {itemType === "room_offer" && (
                      <div className="space-y-4">
                        {/* Mode de réservation */}
                        <div>
                          <Label>Mode de réservation</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {pill("fixed", cfBookingMode, (v) => setCfBookingMode(v as "fixed" | "libre"), "Créneau fixe")}
                            {pill("libre", cfBookingMode, (v) => setCfBookingMode(v as "fixed" | "libre"), "Choix libre")}
                          </div>
                          {cfBookingMode === "libre" && (
                            <div className="mt-3 space-y-2">
                              <Label>{tx("Unité de facturation", "Billing unit")}</Label>
                              <div className="flex gap-2 mt-1">
                                {pill("per_day",  cfPricingUnit, (v) => setCfPricingUnit(v as "per_day" | "per_hour"), tx("Par jour", "Per day"))}
                                {pill("per_hour", cfPricingUnit, (v) => setCfPricingUnit(v as "per_day" | "per_hour"), tx("Par heure", "Per hour"))}
                              </div>
                              <p className="text-[12px] text-muted-foreground">
                                {tx("Le prix saisi ci-dessous correspond au tarif", "The price entered below is the rate")}{" "}
                                <span className="font-medium text-foreground">{cfPricingUnit === "per_hour" ? tx("à l'heure", "per hour") : tx("à la journée", "per day")}</span>.{" "}
                                {tx("Le total sera calculé automatiquement selon la durée choisie.", "The total will be calculated automatically based on the chosen duration.")}
                              </p>
                            </div>
                          )}
                        </div>
                        {cfBookingMode === "fixed" && (
                          <>
                            {/* Date du créneau */}
                            <div className="space-y-1.5">
                              <Label>{tx("Date du créneau", "Slot date")}</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    data-empty={!cfSlotDate}
                                    className="w-full justify-start text-left font-normal h-9 text-[13.5px] data-[empty=true]:text-muted-foreground"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                    {cfSlotDate ? format(cfSlotDate, "d MMMM yyyy", { locale: dateFnsFr }) : tx("Choisir une date", "Pick a date")}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar mode="single" selected={cfSlotDate} onSelect={setCfSlotDate} captionLayout="dropdown" autoFocus />
                                </PopoverContent>
                              </Popover>
                            </div>
                            {/* Heure de début / Heure de fin */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label>{tx("Heure de début", "Start time")}</Label>
                                <div className="flex items-center gap-1.5">
                                  <Select value={cfSlotHour} onValueChange={setCfSlotHour}>
                                    <SelectTrigger className="h-9 text-[13.5px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map(h => (
                                        <SelectItem key={h} value={h}>{h}h</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <span className="text-muted-foreground font-medium">:</span>
                                  <Select value={cfSlotMinute} onValueChange={setCfSlotMinute}>
                                    <SelectTrigger className="h-9 text-[13.5px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {["00", "15", "30", "45"].map(m => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label>{tx("Heure de fin", "End time")}</Label>
                                <div className="flex items-center gap-1.5">
                                  <Select value={cfSlotEndHour} onValueChange={setCfSlotEndHour}>
                                    <SelectTrigger className="h-9 text-[13.5px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map(h => (
                                        <SelectItem key={h} value={h}>{h}h</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <span className="text-muted-foreground font-medium">:</span>
                                  <Select value={cfSlotEndMinute} onValueChange={setCfSlotEndMinute}>
                                    <SelectTrigger className="h-9 text-[13.5px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {["00", "15", "30", "45"].map(m => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                        {/* Modalité */}
                        <div>
                          <Label>{tx("Modalité", "Modality")}<Hint text={tx("Comment ce service est-il rendu ? Sur place, en ligne ou à domicile.", "How is this service delivered? On-site, online, or at home.")} /></Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {pill("on_site", cfModality, setCfModality, tx("Sur place","On site"))}
                            {pill("online",  cfModality, setCfModality, tx("En ligne","Online"))}
                            {pill("home",    cfModality, setCfModality, tx("À domicile","At home"))}
                          </div>
                        </div>
                        {cfModality === "online" && (
                          <div>
                            <Label>{tx("Lien visio", "Video link")}</Label>
                            <Input value={cfMeetLink} onChange={e => setCfMeetLink(e.target.value)} placeholder="https://meet.google.com/..." />
                          </div>
                        )}
                      </div>
                    )}

                    {itemType === "menu_item" && (
                      <div>
                        <Label>{tx("Fréquence", "Frequency")}</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {pill("weekly",  cfFrequency, setCfFrequency, tx("Hebdo","Weekly"))}
                          {pill("monthly", cfFrequency, setCfFrequency, tx("Mensuel","Monthly"))}
                          {pill("yearly",  cfFrequency, setCfFrequency, tx("Annuel","Annual"))}
                        </div>
                      </div>
                    )}

                    {itemType === "delivery" && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>{tx("Tarification", "Pricing type")}</Label>
                          <Select value={cfPricingType} onValueChange={setCfPricingType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="flat">{tx("Prix fixe", "Flat rate")}</SelectItem>
                              <SelectItem value="per_km">{tx("Par km", "Per km")}</SelectItem>
                              <SelectItem value="per_zone">{tx("Par zone", "Per zone")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>{tx("Délai", "Delay")}</Label>
                          <Select value={cfDelay} onValueChange={setCfDelay}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="express">{tx("Express <2h", "Express <2h")}</SelectItem>
                              <SelectItem value="same_day">{tx("Jour même", "Same day")}</SelectItem>
                              <SelectItem value="next_day">J+1</SelectItem>
                              <SelectItem value="standard">{tx("Standard 2-5j", "Standard 2-5d")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <p className="text-[14px] font-semibold text-foreground">{tx("Images", "Images")}</p>
                <ImageDropZone value={itemImgUrl} onChange={setItemImgUrl} label={tx("Image principale", "Main image")} />
                {itemExtraImgUrls.map((url, idx) => (
                  <div key={idx} className="flex items-end gap-2">
                    <div className="flex-1">
                      <ImageDropZone value={url} onChange={v => setItemExtraImgUrls(p => p.map((u, i) => i === idx ? v : u))} label={`${tx("Image", "Image")} ${idx + 2}`} />
                    </div>
                    <Button type="button" variant="ghost" onClick={() => setItemExtraImgUrls(p => p.filter((_, i) => i !== idx))} className="mb-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors" title={tx("Supprimer", "Remove")}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="ghost" onClick={() => setItemExtraImgUrls(p => [...p, ""])} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-transparent transition-colors px-0">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  {tx("Ajouter une image", "Add an image")}
                </Button>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <p className="text-[14px] font-semibold text-foreground">{tx("Disponibilité", "Availability")}</p>
                <div className="space-y-1.5">
                  <Label>{tx("Statut", "Status")}</Label>
                  <Select value={itemStatus} onValueChange={setItemStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">{tx("Disponible", "Available")}</SelectItem>
                      <SelectItem value="unavailable">{tx("Indisponible", "Unavailable")}</SelectItem>
                      <SelectItem value="seasonal">{tx("Saisonnier", "Seasonal")}</SelectItem>
                      <SelectItem value="draft">{tx("Brouillon", "Draft")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-medium text-foreground">{tx("Article actif", "Active item")}</p>
                    <p className="text-[13px] text-muted-foreground">{tx("Visible par les clients", "Visible to customers")}</p>
                  </div>
                  <Switch checked={itemActive} onCheckedChange={setItemActive} className="scale-75" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setCatalogView("list")}>{tx("Annuler", "Cancel")}</Button>
            <Button type="submit" disabled={saving || (!itemCatId && itemType !== "delivery")}>
              {saving ? (editingItem ? tx("Mise à jour…", "Updating…") : tx("Création…", "Creating…")) : (editingItem ? tx("Mettre à jour", "Update") : tx("Créer l'article", "Create item"))}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-baseline gap-2 text-[17px] font-semibold tracking-[-0.025em] text-foreground">
            {tx("Catalogue", "Catalog")}
            {items.length > 0 && <span className="text-[13px] font-normal text-muted-foreground">{items.length}</span>}
          </h2>
        <div className="flex items-center gap-2">

          {/* Desktop buttons (lg+) */}
          <div className="hidden lg:flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowCatDrawer(true)}>
              {tx("Catégories", "Categories")}
              {categories.length > 0 && <span className="ml-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-muted px-1 text-[11px] font-semibold text-muted-foreground">{categories.length}</span>}
            </Button>
            <Button variant="outline" onClick={() => setShowZoneDrawer(true)}>
              {tx("Zones", "Zones")}
              {zones.length > 0 && <span className="ml-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-muted px-1 text-[11px] font-semibold text-muted-foreground">{zones.length}</span>}
            </Button>
            <div className="h-5 w-px bg-border" />
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {tx("Importer", "Import")}
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={items.length === 0}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              {tx("Exporter", "Export")}
            </Button>
          </div>

          {/* Mobile/tablet icon menu (< lg) */}
          <CatHeaderMenu
            onCategories={() => setShowCatDrawer(true)}
            onZones={() => setShowZoneDrawer(true)}
            onImport={() => setShowImport(true)}
            onExport={exportCsv}
            canExport={items.length > 0}
            tx={tx}
          />

          <Button
            variant="outline"
            onClick={storeToken ? copyStoreLink : generateStoreLink}
            disabled={generatingLink}
            className="gap-1.5"
            title={storeToken ? tx("Copier le lien de la boutique", "Copy store link") : tx("Générer un lien public vers votre boutique en ligne", "Generate a public link to your online store")}
          >
            {storeToken ? (
              storeLinkCopied ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                  {tx("Copié !", "Copied!")}
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  {tx("Copier le lien", "Copy link")}
                </>
              )
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                {generatingLink ? tx("Génération…", "Generating…") : tx("Lien boutique", "Store link")}
              </>
            )}
          </Button>
          <Button onClick={openCreateForm}>+ {tx("Ajouter un produit", "Add product")}</Button>
        </div>
      </div>

      {/* Store link popover */}
      {showStoreLink && storeUrl && (
        <div className="mb-4 flex items-center gap-2 rounded-[14px] bg-primary/10 px-3.5 py-2.5 shadow-[0_6px_18px_-14px_rgba(255,204,0,0.25)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-primary hover:underline">
            {storeUrl}
          </a>
          <button
            onClick={copyStoreLink}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-card px-2.5 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-card/80"
          >
            {storeLinkCopied ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {tx("Copié", "Copied")}
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                {tx("Copier", "Copy")}
              </>
            )}
          </button>
          <button onClick={() => setShowStoreLink(false)} className="shrink-0 text-muted-foreground hover:text-foreground">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-3 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <Input
          value={catSearch}
          onChange={e => setCatSearch(e.target.value)}
          placeholder={tx("Rechercher un article par nom, catégorie ou SKU", "Search by name, category or SKU")}
          className={cn("h-9 pl-8 text-[13.5px]", catSearch ? "pr-14 border-primary" : "pr-9")}
        />
        {catSearch && (
          <Button
            variant="ghost"
            onClick={() => setCatSearch("")}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-transparent transition-colors p-0.5"
            title={tx("Effacer", "Clear")}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => setShowFilterDrawer(true)}
          className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded p-0.5 hover:bg-transparent active:-translate-y-1/2 transition-colors ${
            hasActiveFilters ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={tx("Filtres", "Filters")}
          title={tx("Filtres", "Filters")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          {hasActiveFilters && (
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </Button>
      </div>

      {/* Filter drawer */}
      <Sheet open={showFilterDrawer} onOpenChange={setShowFilterDrawer}>
        <SheetContent side="right" className="w-72 flex flex-col p-0">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-[15px]">{tx("Filtres", "Filters")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <div>
              <p className={`${SECTION_HEAD} mb-2`}>{tx("Catégorie", "Category")}</p>
              <div className="space-y-2">
                <Label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" name="cat-filter" checked={activeCat === "all"} onChange={() => { setActiveCat("all"); setPage(1); }} className="accent-primary" />
                  <span className="text-[14px] text-foreground">{tx("Toutes", "All")}</span>
                </Label>
                {categories.map(c => (
                  <Label key={c.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="cat-filter" checked={activeCat === c.id} onChange={() => { setActiveCat(c.id); setPage(1); }} className="accent-primary" />
                    <span className="text-[14px] text-foreground truncate">{c.name}</span>
                  </Label>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <p className={`${SECTION_HEAD} mb-2`}>{tx("Visibilité", "Visibility")}</p>
              <div className="space-y-2">
                {([["all", tx("Tous", "All")], ["active", tx("Visible", "Visible")], ["inactive", tx("Masqué", "Hidden")]] as const).map(([val, label]) => (
                  <Label key={val} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="vis-filter" checked={filterVisibility === val} onChange={() => setFilterVisibility(val)} className="accent-primary" />
                    <span className="text-[14px] text-foreground">{label}</span>
                  </Label>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <p className={`${SECTION_HEAD} mb-2`}>{tx("Type de produit", "Product type")}</p>
              <div className="space-y-2">
                {([["all", tx("Tous", "All")], ...ITEM_TYPES.map(t => [t.value, t.label])] as [string, string][]).map(([val, label]) => (
                  <Label key={val} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="type-filter" checked={filterType === val} onChange={() => setFilterType(val)} className="accent-primary" />
                    <span className="text-[14px] text-foreground">{label}</span>
                  </Label>
                ))}
              </div>
            </div>
            {zones.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className={`${SECTION_HEAD} mb-2`}>{tx("Zone de livraison", "Delivery zone")}</p>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="radio" name="zone-filter" checked={filterZone === "all"} onChange={() => setFilterZone("all")} className="accent-primary" />
                      <span className="text-[14px] text-foreground">{tx("Toutes", "All")}</span>
                    </Label>
                    {zones.map(z => (
                      <Label key={z.id} className="flex items-center gap-2.5 cursor-pointer">
                        <input type="radio" name="zone-filter" checked={filterZone === z.id} onChange={() => setFilterZone(z.id)} className="accent-primary" />
                        <span className="text-[14px] text-foreground truncate">{z.name}</span>
                      </Label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="border-t border-border px-5 py-4">
            <Button variant="outline" onClick={resetAllFilters} className="w-full">
              {tx("Réinitialiser les filtres", "Reset filters")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <SkeletonRow key={i} />)}</div>
      ) : filtered.length === 0 ? (
        hasActiveFilters ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <p className="text-[15px] font-medium text-foreground">{tx("Aucun résultat", "No results")}</p>
            <p className="text-[13.5px] text-muted-foreground">{tx("Aucun article ne correspond aux filtres actifs.", "No items match the active filters.")}</p>
            <Button variant="outline" onClick={resetAllFilters}>{tx("Réinitialiser les filtres", "Reset filters")}</Button>
          </div>
        ) : (
          <EmptyState
            icon="business"
            title={tx("Votre catalogue est vide", "Your catalog is empty")}
            desc={tx("Ajoutez un premier produit ou service — votre agent Duo le proposera automatiquement à vos clients sur WhatsApp.", "Add your first product or service — your Duo agent will automatically offer it to customers on WhatsApp.")}
            onAdd={openCreateForm}
          />
        )
      ) : (
        <>
          <div className="overflow-hidden rounded-[16px] bg-card shadow-[0_10px_30px_-20px_rgba(15,23,42,0.25)]">

            {/* ── Mobile card list (< sm) ── */}
            <div className="sm:hidden">
              {/* Mobile header */}
              <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-2.5">
                <Checkbox
                  checked={selItems.size === filtered.length && filtered.length > 0}
                  onCheckedChange={() => {
                    if (selItems.size === filtered.length) setSelItems(new Set());
                    else setSelItems(new Set(filtered.map(i => i.id)));
                  }}
                  className="h-3.5 w-3.5"
                />
                <span className="flex flex-1 items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {tx("Articles", "Items")}
                  {selItems.size > 0 && <CatBulkDropdown count={selItems.size} onDelete={bulkDeleteItems} onClear={() => setSelItems(new Set())} tx={tx} />}
                </span>
              </div>
              {pagedItems.map(item => {
                const selected = selItems.has(item.id);
                const previewUrl = item.images[0]?.url || item.imageUrl;
                const isTogglingV = toggling === item.id + "_v";
                const isTogglingE = toggling === item.id + "_e";
                const isEpuise = item.availabilityStatus === "unavailable";
                return (
                  <div
                    key={item.id}
                    onClick={() => openEditForm(item)}
                    className={`flex cursor-pointer items-center gap-3 border-b border-border px-3 py-3 last:border-0 transition-colors ${selected ? "bg-primary/5" : "hover:bg-muted/50"}`}
                  >
                    <Checkbox checked={selected} onCheckedChange={() => toggleItem(item.id)} onClick={e => e.stopPropagation()} className="h-3.5 w-3.5 shrink-0" />
                    {previewUrl ? (
                      <Image src={previewUrl} alt={item.name} width={36} height={36} unoptimized className="h-9 w-9 shrink-0 rounded-lg border border-border object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 text-muted-foreground"><ItemTypePlaceholder type={item.itemType} size={16} /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-foreground">{item.name}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{item.categoryName || tx("Sans catégorie", "No category")} · {itemTypeLabel(item.itemType || "")}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5" onClick={e => e.stopPropagation()}>
                      <span className="text-[13.5px] font-medium text-foreground">{fmt(item.basePrice, item.currency || "XOF", language)}</span>
                      <div className="flex items-center gap-2">
                        <Switch checked={isEpuise} onCheckedChange={() => toggleEpuise(item)} disabled={isTogglingE} title={isEpuise ? tx("En stock", "In stock") : tx("Épuisé", "Out of stock")} className="scale-75" />
                        <Switch checked={item.isActive} onCheckedChange={() => toggleVisible(item)} disabled={isTogglingV} title={item.isActive ? tx("Masquer", "Hide") : tx("Afficher", "Show")} className="scale-75" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table (≥ sm) ── */}
            <div className="hidden sm:block">
              {/* Header row */}
              <div
                className="grid items-center border-b border-border bg-card px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground"
                style={{ gridTemplateColumns: "20px 44px minmax(0,1.2fr) 1fr 1fr 56px 56px" }}
              >
                <Checkbox
                  checked={selItems.size === filtered.length && filtered.length > 0}
                  onCheckedChange={() => {
                    if (selItems.size === filtered.length) setSelItems(new Set());
                    else setSelItems(new Set(filtered.map(i => i.id)));
                  }}
                  className="h-3.5 w-3.5"
                />
                <span />
                <span className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => handleCatSort("name")} className="flex items-center gap-0.5 h-auto px-1 py-0 font-semibold text-[11.5px] normal-case tracking-wide text-foreground hover:bg-transparent transition-colors cursor-pointer select-none">
                    {tx("Nom", "Name")}
                    <span className={catSortKey === "name" ? "text-primary" : "text-muted-foreground/70"}>{catSortKey === "name" ? (catSortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                  </Button>
                  {selItems.size > 0 && <CatBulkDropdown count={selItems.size} onDelete={bulkDeleteItems} onClear={() => setSelItems(new Set())} tx={tx} />}
                </span>
                <Button variant="ghost" onClick={() => handleCatSort("type")} className="flex items-center gap-0.5 h-auto px-1 py-0 font-semibold text-[11.5px] normal-case tracking-wide text-foreground hover:bg-transparent transition-colors cursor-pointer select-none">
                  {tx("Type", "Type")}
                  <span className={catSortKey === "type" ? "text-primary" : "text-muted-foreground/70"}>{catSortKey === "type" ? (catSortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                </Button>
                <Button variant="ghost" onClick={() => handleCatSort("price")} className="flex items-center gap-0.5 h-auto px-1 py-0 font-semibold text-[11.5px] normal-case tracking-wide text-foreground hover:bg-transparent transition-colors cursor-pointer select-none">
                  {tx("Prix", "Price")}
                  <span className={catSortKey === "price" ? "text-primary" : "text-muted-foreground/70"}>{catSortKey === "price" ? (catSortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                </Button>
                <span className="text-center normal-case" title={tx("Marquer comme épuisé", "Mark as out of stock")}>{tx("Épuisé", "Out of stock")}</span>
                <span className="text-center normal-case" title={tx("Visible par les clients", "Visible to customers")}>{tx("Visible", "Visible")}</span>
              </div>

              {pagedItems.map(item => {
                const selected = selItems.has(item.id);
                const previewUrl = item.images[0]?.url || item.imageUrl;
                const isTogglingV = toggling === item.id + "_v";
                const isTogglingE = toggling === item.id + "_e";
                const isEpuise = item.availabilityStatus === "unavailable";
                return (
                  <div
                    key={item.id}
                    onClick={() => openEditForm(item)}
                    className={`grid cursor-pointer items-center border-b border-border px-4 py-3.5 last:border-0 transition-colors ${selected ? "bg-primary/5" : "hover:bg-muted/50"}`}
                    style={{ gridTemplateColumns: "20px 44px minmax(0,1.2fr) 1fr 1fr 56px 56px" }}
                  >
                    <Checkbox checked={selected} onCheckedChange={() => toggleItem(item.id)} onClick={e => e.stopPropagation()} className="h-3.5 w-3.5" />

                    {previewUrl ? (
                      <Image src={previewUrl} alt={item.name} width={36} height={36} unoptimized className="h-9 w-9 rounded-[10px] border border-border object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-[10px] border border-dashed border-border bg-muted/50 flex items-center justify-center text-muted-foreground"><ItemTypePlaceholder type={item.itemType} size={15} /></div>
                    )}

                    <div className="min-w-0 pr-2">
                      <p className="truncate text-[13.5px] font-medium text-foreground" title={item.name}>{item.name}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{item.categoryName || tx("Sans catégorie", "No category")}</p>
                    </div>

                    <div><ItemTypeBadge type={item.itemType} /></div>

                    <span className="text-[13.5px] font-medium text-foreground">{fmt(item.basePrice, item.currency || "XOF", language)}</span>

                    <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                      <Switch checked={isEpuise} onCheckedChange={() => toggleEpuise(item)} disabled={isTogglingE} title={isEpuise ? tx("Remettre en stock", "Mark in stock") : tx("Marquer épuisé", "Mark out of stock")} className="scale-75" />
                    </div>

                    <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                      <Switch checked={item.isActive} onCheckedChange={() => toggleVisible(item)} disabled={isTogglingV} title={item.isActive ? tx("Masquer", "Hide") : tx("Afficher", "Show")} className="scale-75" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <Pagination page={page} total={filtered.length} onChange={setPage} />
        </>
      )}

      {/* ── Drawer catégories ── */}
      {/* Drawer catégories */}
      <Sheet open={showCatDrawer} onOpenChange={setShowCatDrawer}>
        <SheetContent side="right" className="w-80 flex flex-col p-0">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-[15px]">{tx("Catégories", "Categories")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <Button variant="outline" size="sm" className="w-full mb-4" onClick={() => { setShowCatDrawer(false); openCatModal(); }}>+ {tx("Ajouter une catégorie", "Add category")}</Button>
            {categories.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-[14px] text-muted-foreground">{tx("Aucune catégorie.", "No categories yet.")}</p>
              </div>
            ) : (
              <CatalogCategoryManageList
                categories={categories}
                categoryCounts={categoryCounts}
                selCats={selCats}
                toggleCategory={toggleCategory}
                setActiveCat={(id) => { setActiveCat(id); setShowCatDrawer(false); }}
                openCatModal={(cat) => { setShowCatDrawer(false); openCatModal(cat); }}
                deleteCategory={deleteCategory}
                tx={tx}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Drawer zones de livraison */}
      <Sheet open={showZoneDrawer} onOpenChange={setShowZoneDrawer}>
        <SheetContent side="right" className="w-80 flex flex-col p-0">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-[15px]">{tx("Zones de livraison", "Delivery zones")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <Button variant="outline" size="sm" className="w-full mb-4" onClick={() => { setShowZoneDrawer(false); openZoneModal(); }}>+ {tx("Ajouter une zone", "Add zone")}</Button>
              {zones.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-[14px] text-muted-foreground">{tx("Aucune zone de livraison.", "No delivery zones yet.")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {zones.map(z => (
                    <div key={z.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${z.isActive ? "border-border bg-muted/50" : "border-border bg-muted/50 opacity-60"}`}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-foreground">{z.name}</p>
                        {(z.city || z.district) && (
                          <p className="truncate text-[12px] text-muted-foreground">{[z.city, z.district].filter(Boolean).join(" · ")}</p>
                        )}
                        {!z.isActive && <p className="text-[11px] text-muted-foreground">{tx("Inactive", "Inactive")}</p>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => { setShowZoneDrawer(false); openZoneModal(z); }}
                        title={tx("Modifier", "Edit")}
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10.5 2.5l3 3M2 14h3l8.75-8.75a1.768 1.768 0 000-2.5l-.5-.5a1.768 1.768 0 00-2.5 0L2 11v3z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteZone(z.id)}
                        title={tx("Supprimer", "Delete")}
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Modale zone ── */}
      {pendingDeleteZoneId && (
        <ConfirmDialog
          title={tx("Supprimer la zone ?", "Delete zone?")}
          message={tx("Cette zone de livraison sera définitivement supprimée.", "This delivery zone will be permanently deleted.")}
          confirmLabel={tx("Supprimer", "Delete")}
          onConfirm={confirmDeleteZone}
          onCancel={() => setPendingDeleteZoneId(null)}
        />
      )}
      {showBulkItemsConfirm && (
        <ConfirmDialog
          title={tx(`Supprimer ${selItems.size} article${selItems.size > 1 ? "s" : ""} ?`, `Delete ${selItems.size} item${selItems.size > 1 ? "s" : ""}?`)}
          message={tx("Cette action est irréversible. Les articles seront définitivement supprimés.", "This action is permanent. The items will be permanently deleted.")}
          confirmLabel={tx("Supprimer", "Delete")}
          onConfirm={confirmBulkDeleteItems}
          onCancel={() => setShowBulkItemsConfirm(false)}
        />
      )}
      {showBulkCatsConfirm && (
        <ConfirmDialog
          title={tx(`Supprimer ${selCats.size} catégorie${selCats.size > 1 ? "s" : ""} ?`, `Delete ${selCats.size} categor${selCats.size > 1 ? "ies" : "y"}?`)}
          message={tx("Toutes les articles de ces catégories seront aussi supprimés. Action irréversible.", "All items in these categories will also be deleted. This cannot be undone.")}
          confirmLabel={tx("Supprimer", "Delete")}
          onConfirm={confirmBulkDeleteCategories}
          onCancel={() => setShowBulkCatsConfirm(false)}
        />
      )}
      {showZoneModal && (
        <Modal title={editingZone ? tx("Modifier la zone", "Edit zone") : tx("Nouvelle zone", "New zone")} onClose={() => setShowZoneModal(false)}>
          <form onSubmit={saveZone} className="space-y-4">
            <div><Label>{tx("Nom", "Name")} *</Label><Input required maxLength={100} value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder={tx("Ex : Centre-ville", "e.g. Downtown")} /></div>
            <div><Label>{tx("Ville", "City")}</Label><Input maxLength={100} value={zoneCity} onChange={e => setZoneCity(e.target.value)} placeholder={tx("Ex : Douala", "e.g. Douala")} /></div>
            <div><Label>{tx("Quartier", "District")}</Label><Input maxLength={100} value={zoneDistrict} onChange={e => setZoneDistrict(e.target.value)} placeholder={tx("Ex : Akwa", "e.g. Akwa")} /></div>
            <Label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox checked={zoneActive} onCheckedChange={v => setZoneActive(!!v)} />
              <span className="text-[14px] text-muted-foreground">{tx("Zone active", "Active zone")}</span>
            </Label>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowZoneModal(false)}>{tx("Annuler", "Cancel")}</Button>
              <Button type="submit" disabled={savingZone}>{savingZone ? (editingZone ? tx("Mise à jour…", "Updating…") : tx("Création…", "Creating…")) : (editingZone ? tx("Mettre à jour", "Update") : tx("Créer", "Create"))}</Button>
            </DialogFooter>
          </form>
        </Modal>
      )}

      {showCatModal && (
        <Modal title={editingCat ? tx("Modifier la catégorie", "Edit category") : tx("Nouvelle catégorie", "New category")} onClose={() => setShowCatModal(false)}>
          <form onSubmit={saveCat} className="space-y-4">
            <div><Label>{tx("Nom", "Name")} *</Label><Input required maxLength={100} value={catName} onChange={e => setCatName(e.target.value)} placeholder={tx("Ex : Boissons", "e.g. Drinks")} /></div>
            <div><Label>{tx("Description", "Description")}</Label><Textarea value={catDesc} onChange={e => setCatDesc(e.target.value)} rows={2} maxLength={500} /></div>
            <Label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox checked={catActive} onCheckedChange={v => setCatActive(!!v)} />
              <span className="text-[14px] text-muted-foreground">{tx("Visible dans le catalogue", "Visible in catalog")}</span>
            </Label>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowCatModal(false)}>{tx("Annuler", "Cancel")}</Button>
              <Button type="submit" disabled={saving}>{saving ? (editingCat ? tx("Mise à jour…", "Updating…") : tx("Création…", "Creating…")) : (editingCat ? tx("Mettre à jour", "Update") : tx("Créer", "Create"))}</Button>
            </DialogFooter>
          </form>
        </Modal>
      )}

      {imageItem && (
        <ItemImagesModal
          item={imageItem}
          onClose={() => setImageItem(null)}
          onUpdate={(updatedItem) => {
            setItems(p => p.map(i => i.id === updatedItem.id ? updatedItem : i));
            setImageItem(updatedItem);
          }}
        />
      )}

      {showImport && (
        <CsvImportModal
          title={tx("Importer des articles", "Import items")}
          fields={[
            { key: "name", label: tx("Nom", "Name"), required: true },
            { key: "category", label: tx("Catégorie", "Category") },
            { key: "price", label: tx("Prix", "Price") },
            { key: "currency", label: tx("Devise", "Currency") },
            { key: "sku", label: "SKU" },
            { key: "type", label: tx("Type", "Type") },
            { key: "description", label: tx("Description", "Description") },
            { key: "status", label: tx("Statut", "Status") },
          ]}
          onImport={onImportItems}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}