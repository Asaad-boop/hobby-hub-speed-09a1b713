import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  Smartphone,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export const Route = createFileRoute("/admin/homepage")({
  component: AdminHomepagePage,
});

const ALL_SECTION_TYPES: SectionType[] = [
  "hero",
  "banner",
  "categories",
  "products",
  "reels",
  "rich_text",
  "image_with_text",
  "category_grid",
  "testimonials",
  "newsletter",
  "countdown",
  "trust_badges",
  "track_order",
  "spacer",
];

function AdminHomepagePage() {
  const { data, isLoading } = useSiteSettings();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (data) {
      setForm(data);
      if (!selectedId && data.homepage_sections?.length) {
        setSelectedId(data.homepage_sections[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const sections = form.homepage_sections;
  const selected = useMemo(() => sections.find((s) => s.id === selectedId) ?? null, [sections, selectedId]);

  const setSettingsField = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const updateSections = (next: HomepageSection[]) =>
    setForm((p) => ({ ...p, homepage_sections: next }));

  const patchSection = (
    id: string,
    patch: Partial<HomepageSection> | ((s: HomepageSection) => HomepageSection),
  ) => {
    updateSections(
      sections.map((s) =>
        s.id === id ? (typeof patch === "function" ? patch(s) : { ...s, ...patch }) : s,
      ),
    );
  };

  const removeSection = (id: string) => {
    updateSections(sections.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(sections[0]?.id ?? null);
  };

  const addSection = (type: SectionType) => {
    const sec = newSection(type);
    updateSections([...sections, sec]);
    setSelectedId(sec.id);
    toast.success(`${SECTION_LABELS[type]} added`);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    updateSections(arrayMove(sections, oldIdx, newIdx));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await saveSiteSettings(form);
      await queryClient.invalidateQueries({ queryKey: ["site_settings"] });
      toast.success("Homepage saved — refreshing preview");
      previewRef.current?.contentWindow?.location.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const refreshPreview = () => previewRef.current?.contentWindow?.location.reload();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-background p-3">
        <div>
          <h1 className="text-lg font-extrabold leading-tight">Homepage builder</h1>
          <p className="text-[11px] text-muted-foreground">Drag sections to reorder · click to edit · live preview on the right</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-muted p-0.5">
            <button
              onClick={() => setDevice("desktop")}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition ${device === "desktop" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              <Monitor className="h-3.5 w-3.5" /> Desktop
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition ${device === "mobile" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              <Smartphone className="h-3.5 w-3.5" /> Mobile
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={refreshPreview}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save & publish
          </Button>
        </div>
      </div>

      {/* Three panes */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[280px_360px_1fr]">
        {/* Sections list */}
        <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wider">Sections</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <Plus className="h-4 w-4" /> Add
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
          <div className="flex-1 overflow-auto p-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {sections.map((s) => (
                    <SortableRow
                      key={s.id}
                      section={s}
                      selected={selectedId === s.id}
                      onSelect={() => setSelectedId(s.id)}
                      onToggle={(v) => patchSection(s.id, { enabled: v })}
                      onRemove={() => removeSection(s.id)}
                    />
                  ))}
                  {sections.length === 0 && (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                      No sections. Click Add ↑
                    </p>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Editor */}
        <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-background">
          <div className="border-b border-border px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wider">Edit section</span>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {selected ? (
              <SectionEditor
                section={selected}
                onChange={(p) => patchSection(selected.id, p)}
                settings={form}
                onSettingsChange={setSettingsField}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Select a section from the left to edit.</p>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-muted/30">
          <div className="flex items-center justify-between border-b border-border bg-background px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wider">Live preview</span>
            <a href="/" target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-primary hover:underline">
              Open in new tab ↗
            </a>
          </div>
          <div className="flex flex-1 items-start justify-center overflow-auto p-3">
            <div
              className="h-full overflow-hidden rounded-xl border border-border bg-background shadow-lg transition-all"
              style={{
                width: device === "mobile" ? 390 : "100%",
                maxWidth: device === "mobile" ? 390 : 1400,
              }}
            >
              <iframe
                ref={previewRef}
                src="/"
                title="Homepage preview"
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableRow({
  section,
  selected,
  onSelect,
  onToggle,
  onRemove,
}: {
  section: HomepageSection;
  selected: boolean;
  onSelect: () => void;
  onToggle: (v: boolean) => void;
  onRemove: () => void;
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
      className={`group flex items-center gap-1 rounded-xl border px-2 py-2 transition ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:border-primary/40"
      }`}
    >
      <button
        type="button"
        className="flex h-6 w-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className={`truncate text-sm font-bold ${section.enabled ? "" : "text-muted-foreground"}`}>
          {SECTION_LABELS[section.type]}
        </p>
        <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
          {section.type}
        </p>
      </button>
      <Switch
        checked={section.enabled}
        onCheckedChange={onToggle}
        aria-label={section.enabled ? "Disable" : "Enable"}
      />
      {section.enabled ? (
        <Eye className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
      ) : (
        <EyeOff className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
