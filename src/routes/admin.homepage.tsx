import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  History,
  Layers,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DEFAULT_SETTINGS,
  SECTION_LABELS,
  newSection,
  saveSiteSettings,
  useSiteSettings,
  type HomepageSection,
  type SectionType,
  type SiteSettings,
} from "@/lib/site-settings";
import SectionEditor from "@/components/admin/SectionEditor";
import VersionHistoryPanel from "@/components/admin/VersionHistoryPanel";
import { saveHomepageVersion } from "@/lib/version-history";
import { useHistory, useLocalDraft, readLocalDraft, clearLocalDraft } from "@/hooks/use-history";
import { SECTION_TEMPLATES } from "@/lib/homepage-templates";

export const Route = createFileRoute("/admin/homepage")({
  component: AdminHomepagePage,
});

const ALL_SECTION_TYPES: SectionType[] = [
  "hero", "video_hero", "banner", "categories", "products", "reels", "rich_text",
  "image_with_text", "category_grid", "testimonials", "newsletter", "countdown",
  "trust_badges", "track_order", "faq", "brand_logos", "spacer",
];

const DRAFT_KEY = "hobby_homepage_draft_v1";
type Device = "desktop" | "tablet" | "mobile";

function AdminHomepagePage() {
  const { data, isLoading } = useSiteSettings();
  const queryClient = useQueryClient();
  const { state: form, set: setForm, replace, undo, redo, canUndo, canRedo } =
    useHistory<SiteSettings>(DEFAULT_SETTINGS);

  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [editorOpen, setEditorOpen] = useState(true);
  const [sectionsOpen, setSectionsOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const formRef = useRef(form);
  formRef.current = form;

  // Hydrate from server, then offer to restore local draft if newer
  useEffect(() => {
    if (!data || hydrated) return;
    const draft = readLocalDraft<SiteSettings>(DRAFT_KEY);
    if (draft && draft.value && JSON.stringify(draft.value) !== JSON.stringify(data)) {
      const ageMin = Math.round((Date.now() - draft.at) / 60_000);
      toast.message("Unsaved draft found", {
        description: `Apnar shesh edit ${ageMin}m age. Restore korbo?`,
        duration: 12_000,
        action: { label: "Restore", onClick: () => replace(draft.value) },
        cancel: { label: "Discard", onClick: () => clearLocalDraft(DRAFT_KEY) },
      });
      replace(data);
    } else {
      replace(data);
    }
    if (data.homepage_sections?.length) setSelectedId(data.homepage_sections[0].id);
    setHydrated(true);
  }, [data, hydrated, replace]);

  // Autosave drafts to localStorage
  const dirty = hydrated && data && JSON.stringify(form) !== JSON.stringify(data);
  useLocalDraft(DRAFT_KEY, form, !!dirty);

  const sections = form.homepage_sections;
  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) ?? null,
    [sections, selectedId],
  );

  const setSettingsField = useCallback(
    <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
      setForm((p) => ({ ...p, [key]: value })),
    [setForm],
  );

  const updateSections = useCallback(
    (next: HomepageSection[] | ((prev: HomepageSection[]) => HomepageSection[])) =>
      setForm((p) => ({
        ...p,
        homepage_sections: typeof next === "function" ? next(p.homepage_sections) : next,
      })),
    [setForm],
  );

  const patchSection = useCallback(
    (id: string, patch: Partial<HomepageSection> | ((s: HomepageSection) => HomepageSection)) =>
      updateSections((prev) =>
        prev.map((s) => (s.id === id ? (typeof patch === "function" ? patch(s) : { ...s, ...patch }) : s)),
      ),
    [updateSections],
  );

  const removeSection = (id: string) => {
    updateSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(sections.find((s) => s.id !== id)?.id ?? null);
  };

  const duplicateSection = (id: string) => {
    updateSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const clone: HomepageSection = {
        ...prev[idx],
        id: `sec_${prev[idx].type}_${Math.random().toString(36).slice(2, 9)}`,
        config: JSON.parse(JSON.stringify(prev[idx].config ?? {})),
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      setSelectedId(clone.id);
      return next;
    });
    toast.success("Section duplicated");
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    updateSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const newIdx = idx + dir;
      if (idx < 0 || newIdx < 0 || newIdx >= prev.length) return prev;
      return arrayMove(prev, idx, newIdx);
    });
  };

  const addSection = (type: SectionType) => {
    const sec = newSection(type);
    updateSections((prev) => [...prev, sec]);
    setSelectedId(sec.id);
    setEditorOpen(true);
    toast.success(`${SECTION_LABELS[type]} added`);
  };

  const applyTemplate = (templateId: string) => {
    const tpl = SECTION_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const newSecs = tpl.build();
    updateSections((prev) => [...prev, ...newSecs]);
    setSelectedId(newSecs[0]?.id ?? null);
    toast.success(`${tpl.label} added (${newSecs.length} sections)`);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    updateSections((prev) => {
      const oldIdx = prev.findIndex((s) => s.id === active.id);
      const newIdx = prev.findIndex((s) => s.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveSiteSettings(formRef.current);
      // Snapshot for version history (non-blocking — failure shouldn't block publish)
      try {
        await saveHomepageVersion(formRef.current.homepage_sections);
        setHistoryRefreshKey((k) => k + 1);
      } catch (e) {
        console.warn("Version snapshot failed", e);
      }
      await queryClient.invalidateQueries({ queryKey: ["site_settings"] });
      clearLocalDraft(DRAFT_KEY);
      setLastSavedAt(Date.now());
      toast.success("Published — refreshing preview");
      previewRef.current?.contentWindow?.location.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [queryClient]);

  const restoreVersion = useCallback(
    (sections: HomepageSection[]) => {
      setForm((p) => ({ ...p, homepage_sections: sections }));
      setSelectedId(sections[0]?.id ?? null);
    },
    [setForm],
  );

  const refreshPreview = () => previewRef.current?.contentWindow?.location.reload();

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave();
        return;
      }
      if (meta && !e.shiftKey && e.key.toLowerCase() === "z" && !isTyping) {
        e.preventDefault();
        undo();
      } else if (((meta && e.shiftKey && e.key.toLowerCase() === "z") || (meta && e.key.toLowerCase() === "y")) && !isTyping) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSave, undo, redo]);

  // Listen to inline-click messages from preview iframe
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as
        | { type?: string; id?: string; key?: string; value?: string }
        | undefined;
      if (!d || typeof d !== "object") return;
      if (d.type === "builder:select" && d.id) {
        setSelectedId(d.id);
        setEditorOpen(true);
      } else if (d.type === "builder:edit" && d.id && d.key) {
        patchSection(d.id, (s) => ({
          ...s,
          config: { ...(s.config ?? {}), [d.key as string]: d.value ?? "" },
        }));
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [patchSection]);

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.filter(
      (s) => SECTION_LABELS[s.type].toLowerCase().includes(q) || s.type.includes(q),
    );
  }, [sections, search]);

  const previewWidth = device === "mobile" ? 390 : device === "tablet" ? 820 : "100%";
  const previewMax = device === "mobile" ? 390 : device === "tablet" ? 820 : 1600;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100vh-8rem)] flex-col gap-3">
      {/* Top sticky toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-background p-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={sectionsOpen ? "secondary" : "outline"}
            onClick={() => setSectionsOpen((v) => !v)}
            title="Toggle sections panel"
          >
            <Layers className="h-4 w-4" /> Sections
          </Button>
          <div className="hidden h-6 w-px bg-border md:block" />
          <div>
            <h1 className="text-sm font-extrabold leading-tight">Homepage builder</h1>
            <p className="text-[10px] text-muted-foreground">
              {dirty ? (
                <span className="font-bold text-amber-600">● Unsaved changes — autosaved locally</span>
              ) : lastSavedAt ? (
                <span className="text-emerald-600">✓ Published just now</span>
              ) : (
                <>Click any section in preview · ⌘Z / ⌘⇧Z · ⌘S to publish</>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex rounded-full bg-muted p-0.5">
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" disabled={!canUndo} onClick={undo} title="Undo (⌘Z)">
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" disabled={!canRedo} onClick={redo} title="Redo (⌘⇧Z)">
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex rounded-full bg-muted p-0.5">
            {(["desktop", "tablet", "mobile"] as Device[]).map((d) => {
              const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
              return (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize transition ${
                    device === d ? "bg-background shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{d}</span>
                </button>
              );
            })}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" title="Section templates">
                <Sparkles className="h-4 w-4" /> Templates
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>One-click section bundles</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SECTION_TEMPLATES.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => applyTemplate(t.id)}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <span className="text-sm font-bold">
                    <span className="mr-1.5">{t.icon}</span>
                    {t.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{t.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setHistoryOpen((o) => !o)}
            title="Version history"
          >
            <History className="h-4 w-4" /> History
          </Button>

          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={refreshPreview} title="Refresh preview">
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button size="sm" onClick={onSave} disabled={saving || !dirty}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving" : "Publish"}
          </Button>
        </div>
      </div>

      {/* Main: full-width preview + floating panels */}
      <div className="relative flex min-h-0 flex-1 gap-3">
        <VersionHistoryPanel
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onRestore={restoreVersion}
          refreshKey={historyRefreshKey}
        />
        {/* Sections panel — collapsible left */}
        {sectionsOpen && (
          <div className="flex w-64 shrink-0 min-h-0 flex-col rounded-2xl border border-border bg-background shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-2.5 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Sections ({sections.length})</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-2">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-80 overflow-auto">
                  {ALL_SECTION_TYPES.map((t) => (
                    <DropdownMenuItem key={t} onClick={() => addSection(t)}>
                      {SECTION_LABELS[t]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sections…"
                  className="h-8 pl-7 text-xs"
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={filteredSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {filteredSections.map((s, i) => (
                      <SortableRow
                        key={s.id}
                        section={s}
                        selected={selectedId === s.id}
                        isFirst={i === 0}
                        isLast={i === filteredSections.length - 1}
                        onSelect={() => {
                          setSelectedId(s.id);
                          setEditorOpen(true);
                        }}
                        onToggle={(v) => patchSection(s.id, { enabled: v })}
                        onRemove={() => removeSection(s.id)}
                        onDuplicate={() => duplicateSection(s.id)}
                        onMoveUp={() => moveSection(s.id, -1)}
                        onMoveDown={() => moveSection(s.id, 1)}
                      />
                    ))}
                    {filteredSections.length === 0 && (
                      <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                        {search ? "No matches" : "No sections — click Add"}
                      </p>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
            <div className="border-t border-border p-2">
              <button
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-muted/50 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted"
                onClick={() => {
                  if (data) replace(data);
                  clearLocalDraft(DRAFT_KEY);
                  toast.success("Draft discarded");
                }}
                disabled={!dirty}
              >
                <RotateCcw className="h-3 w-3" /> Discard changes
              </button>
            </div>
          </div>
        )}

        {/* Preview area (full width) */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-background px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Live preview · {device}
            </span>
            <a href="/" target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-primary hover:underline">
              Open in new tab ↗
            </a>
          </div>
          <div className="flex flex-1 items-start justify-center overflow-auto p-3">
            <div
              className="h-full overflow-hidden rounded-xl border border-border bg-background shadow-lg transition-all"
              style={{ width: previewWidth, maxWidth: previewMax }}
            >
              <iframe
                ref={previewRef}
                src="/?builder=1"
                title="Homepage preview"
                className="h-full w-full"
              />
            </div>
          </div>
        </div>

        {/* Floating editor drawer (right) */}
        <div
          className={`pointer-events-none absolute right-0 top-0 z-40 h-full transition-transform duration-300 ${
            editorOpen && selected ? "translate-x-0" : "translate-x-[calc(100%+12px)]"
          }`}
          style={{ width: 380 }}
        >
          <div className="pointer-events-auto flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Editing</p>
                <p className="truncate text-sm font-bold">
                  {selected ? SECTION_LABELS[selected.type] : ""}
                </p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditorOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {selected && (
                <SectionEditor
                  section={selected}
                  onChange={(p) => patchSection(selected.id, p)}
                  settings={form}
                  onSettingsChange={setSettingsField}
                />
              )}
            </div>
            {selected && (
              <div className="flex items-center gap-2 border-t border-border bg-muted/30 p-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => duplicateSection(selected.id)}>
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => removeSection(selected.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Re-open editor handle */}
        {!editorOpen && selected && (
          <button
            className="absolute right-3 top-3 z-30 flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-lg hover:opacity-90"
            onClick={() => setEditorOpen(true)}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Edit panel
          </button>
        )}
      </div>
    </div>
  );
}

function SortableRow({
  section,
  selected,
  isFirst,
  isLast,
  onSelect,
  onToggle,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  section: HomepageSection;
  selected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onToggle: (v: boolean) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border px-1.5 py-1.5 transition ${
        selected ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"
      }`}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex h-6 w-5 shrink-0 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button onClick={onSelect} className="min-w-0 flex-1 text-left">
          <p className={`truncate text-xs font-bold ${section.enabled ? "" : "text-muted-foreground line-through"}`}>
            {SECTION_LABELS[section.type]}
          </p>
        </button>
        <Switch
          checked={section.enabled}
          onCheckedChange={onToggle}
          aria-label={section.enabled ? "Disable" : "Enable"}
          className="scale-75"
        />
      </div>
      <div className="mt-1 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onMoveUp} disabled={isFirst} title="Move up">
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onMoveDown} disabled={isLast} title="Move down">
          <ArrowDown className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onDuplicate} title="Duplicate">
          <Copy className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="ml-auto h-6 w-6 text-destructive hover:text-destructive" onClick={onRemove} title="Delete">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
