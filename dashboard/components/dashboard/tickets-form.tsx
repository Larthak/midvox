"use client";

import React, { useState } from "react";
import {
  Plus,
  Mail,
  Zap,
  Tag,
  Save,
  Trash2,
  Settings2,
  Edit3,
  RefreshCcw,
  MessageSquare,
  Shield,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketConfig, TicketCategory, TicketEmbed } from "@/types/api";

interface TicketsFormProps {
  initialConfig: TicketConfig;
  guildId: string;
}

const labelClass = "text-xs font-medium text-[var(--panel-muted)]";

export function TicketsForm({ initialConfig, guildId }: TicketsFormProps) {
  const [config, setConfig] = useState<TicketConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{index: number, data: TicketCategory} | null>(null);
  const [editingEmbed, setEditingEmbed] = useState<TicketEmbed | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  async function fetchUpdatedConfig() {
    try {
      const data = await api.getTickets(guildId);
      setConfig(data);
    } catch (err) {
      console.error("Failed to fetch ticket config:", err);
    }
  }

  const handleUpdate = async (updateData: any) => {
    setSaving(true);
    const promise = api.updateTickets(guildId, updateData);

    toast.promise(promise, {
      loading: "Updating ticket settings…",
      success: "Settings updated",
      error: "Could not update settings",
    });

    try {
      await promise;
      await fetchUpdatedConfig();
      setIsAdding(false);
      setEditingCategory(null);
      setEditingEmbed(null);
    } catch (err) {
      console.error("Failed to update settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = () => {
    setEditingCategory({
      index: -1,
      data: { name: "", emoji: "📩", staff_roles: [], button_style: 2, discord_category_id: "" }
    });
    setIsAdding(true);
  };

  const handleRemoveCategory = (index: number) => {
    const newCategories = [...config.categories];
    newCategories.splice(index, 1);
    handleUpdate({ categories: newCategories });
  };

  const handleSaveCategory = () => {
    if (!editingCategory) return;
    const newCategories = [...config.categories];
    if (isAdding) {
      newCategories.push(editingCategory.data);
    } else {
      newCategories[editingCategory.index] = editingCategory.data;
    }
    handleUpdate({ categories: newCategories });
  };

  const handleSaveEmbed = () => {
    if (!editingEmbed) return;
    handleUpdate({
      embed_title: editingEmbed.title,
      embed_description: editingEmbed.description,
      embed_color: editingEmbed.color,
      embed_image_url: editingEmbed.image_url,
      embed_thumbnail_url: editingEmbed.thumbnail_url
    });
  };

  const handleSaveGlobal = () => {
    handleUpdate({
      panel_channel: config.panel_channel,
      logging_channel: config.logging_channel,
      closed_category: config.closed_category,
      panel_type: config.panel_type,
      staff_roles: config.staff_roles
    });
  };

  return (
    <>
      <Modal
        open={Boolean(editingCategory)}
        onClose={() => setEditingCategory(null)}
        title={isAdding ? "Add ticket category" : "Edit ticket category"}
        description="Categories become the buttons or options on your ticket panel."
        icon={isAdding ? Plus : Edit3}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setEditingCategory(null)}
              className="h-10"
            >
              Cancel
            </Button>
            <Button
              className="h-10 gap-2"
              onClick={handleSaveCategory}
              disabled={saving || !editingCategory?.data.name}
            >
              {saving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save category
            </Button>
          </>
        }
      >
        {editingCategory && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="ticket-category-name" className={labelClass}>
                Category name
              </label>
              <Input
                id="ticket-category-name"
                value={editingCategory.data.name}
                onChange={(e) => setEditingCategory({...editingCategory, data: {...editingCategory.data, name: e.target.value}})}
                placeholder="e.g. Bug reports"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="ticket-category-emoji" className={labelClass}>
                  Emoji
                </label>
                <Input
                  id="ticket-category-emoji"
                  value={editingCategory.data.emoji || ""}
                  onChange={(e) => setEditingCategory({...editingCategory, data: {...editingCategory.data, emoji: e.target.value}})}
                  placeholder="e.g. 📩"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="ticket-category-roles" className={labelClass}>
                  Staff role IDs
                </label>
                <Input
                  id="ticket-category-roles"
                  value={editingCategory.data.staff_roles.join(", ")}
                  onChange={(e) => {
                    const roles = e.target.value.split(",").map(id => id.trim()).filter(id => id && !isNaN(Number(id))).map(Number);
                    setEditingCategory({
                      ...editingCategory,
                      data: { ...editingCategory.data, staff_roles: roles }
                    })
                  }}
                  placeholder="Comma separated"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className={labelClass}>Button style</label>
                <Select
                  value={String(editingCategory.data.button_style || 2)}
                  onValueChange={(val) => setEditingCategory({
                    ...editingCategory,
                    data: { ...editingCategory.data, button_style: parseInt(val) }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">Blurple</SelectItem>
                    <SelectItem value="1">Grey</SelectItem>
                    <SelectItem value="3">Green</SelectItem>
                    <SelectItem value="4">Red</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="ticket-category-channel" className={labelClass}>
                  Discord category ID
                </label>
                <Input
                  id="ticket-category-channel"
                  value={editingCategory.data.discord_category_id || ""}
                  onChange={(e) => setEditingCategory({
                    ...editingCategory,
                    data: { ...editingCategory.data, discord_category_id: e.target.value }
                  })}
                  placeholder="Where tickets are created"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(editingEmbed)}
        onClose={() => setEditingEmbed(null)}
        title="Customize panel appearance"
        description="This is the message members see when they open a ticket."
        icon={Edit3}
        className="sm:max-w-xl"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setEditingEmbed(null)}
              className="h-10"
            >
              Cancel
            </Button>
            <Button className="h-10 gap-2" onClick={handleSaveEmbed} disabled={saving}>
              {saving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save appearance
            </Button>
          </>
        }
      >
        {editingEmbed && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="ticket-embed-title" className={labelClass}>
                Embed title
              </label>
              <Input
                id="ticket-embed-title"
                value={editingEmbed.title || ""}
                onChange={(e) => setEditingEmbed({...editingEmbed, title: e.target.value})}
                placeholder="e.g. Support department"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ticket-embed-description" className={labelClass}>
                Embed description
              </label>
              <Textarea
                id="ticket-embed-description"
                value={editingEmbed.description || ""}
                onChange={(e) => setEditingEmbed({...editingEmbed, description: e.target.value})}
                placeholder="Open a ticket below to talk to our staff…"
                className="h-24"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="ticket-embed-color" className={labelClass}>
                  Color (decimal)
                </label>
                <Input
                  id="ticket-embed-color"
                  value={editingEmbed.color || ""}
                  onChange={(e) => setEditingEmbed({...editingEmbed, color: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="e.g. 16711680 for red"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="ticket-embed-thumbnail" className={labelClass}>
                  Thumbnail URL
                </label>
                <Input
                  id="ticket-embed-thumbnail"
                  value={editingEmbed.thumbnail_url || ""}
                  onChange={(e) => setEditingEmbed({...editingEmbed, thumbnail_url: e.target.value})}
                  placeholder="Small top-right image"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ticket-embed-image" className={labelClass}>
                Main image URL
              </label>
              <Input
                id="ticket-embed-image"
                value={editingEmbed.image_url || ""}
                onChange={(e) => setEditingEmbed({...editingEmbed, image_url: e.target.value})}
                placeholder="Large bottom image"
              />
            </div>
          </div>
        )}
      </Modal>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="panel-surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] text-[var(--panel-accent-deep)]">
                <Settings2 className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--panel-ink)]">
                  Global configuration
                </h2>
                <p className="mt-0.5 text-xs text-[var(--panel-muted)]">
                  Channels and roles used by every ticket category.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="ticket-panel-channel" className={labelClass}>
                  Panel channel ID
                </label>
                <Input
                  id="ticket-panel-channel"
                  value={config.panel_channel || ""}
                  onChange={(e) => setConfig({...config, panel_channel: e.target.value})}
                  placeholder="Where the ticket panel lives"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="ticket-log-channel" className={labelClass}>
                  Logging channel ID
                </label>
                <Input
                  id="ticket-log-channel"
                  value={config.logging_channel || ""}
                  onChange={(e) => setConfig({...config, logging_channel: e.target.value})}
                  placeholder="Where transcripts go"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="ticket-closed-category" className={labelClass}>
                  Closed tickets category ID
                </label>
                <Input
                  id="ticket-closed-category"
                  value={config.closed_category || ""}
                  onChange={(e) => setConfig({...config, closed_category: e.target.value})}
                  placeholder="Archive closed tickets here"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Panel interaction type</label>
                <Select
                  value={config.panel_type || "button"}
                  onValueChange={(val) => setConfig({...config, panel_type: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="button">Buttons</SelectItem>
                    <SelectItem value="dropdown">Dropdown menu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label htmlFor="ticket-staff-roles" className={labelClass}>
                  Global staff role IDs
                </label>
                <Input
                  id="ticket-staff-roles"
                  value={config.staff_roles.join(", ")}
                  onChange={(e) => {
                    const roles = e.target.value.split(",").map(id => id.trim()).filter(id => id && !isNaN(Number(id))).map(Number);
                    setConfig({...config, staff_roles: roles})
                  }}
                  placeholder="Comma separated. These roles can see all tickets."
                />
              </div>
            </div>

            <Button onClick={handleSaveGlobal} disabled={saving} className="mt-5 w-full gap-2" variant="secondary">
              {saving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save core settings
            </Button>
          </section>

          <section className="panel-surface overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-line)] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2.5">
                <Tag className="h-4 w-4 text-[var(--panel-accent-deep)]" />
                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--panel-ink)]">
                    Ticket categories
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--panel-muted)]">
                    {config.categories.length} configured
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={handleAddCategory}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            <div className="p-5 sm:p-6">
              {config.categories.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--panel-line)] px-5 py-8 text-center">
                  <Ticket className="h-5 w-5 text-[var(--panel-faint)]" />
                  <p className="text-[13px] font-medium text-[var(--panel-ink)]">
                    No categories yet
                  </p>
                  <p className="max-w-xs text-xs leading-5 text-[var(--panel-muted)]">
                    Add a category to give members a clear reason to open a ticket.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {config.categories.map((cat, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] p-3.5 transition-colors hover:border-[var(--panel-accent)]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--panel-line)] bg-[var(--panel-paper)] text-lg">
                          {cat.emoji || "📩"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[var(--panel-ink)]">
                            {cat.name}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--panel-muted)]">
                            <Shield className="h-3 w-3" />
                            {cat.staff_roles && cat.staff_roles.length > 0
                              ? `${cat.staff_roles.length} staff roles`
                              : "Global staff"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory({index: i, data: {...cat}});
                            setIsAdding(false);
                          }}
                          className="rounded-lg p-1.5 text-[var(--panel-muted)] transition-colors hover:bg-[var(--panel-paper)] hover:text-[var(--panel-ink)]"
                          aria-label={`Edit ${cat.name}`}
                        >
                          <Settings2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(i)}
                          className="rounded-lg p-1.5 text-[var(--panel-muted)] transition-colors hover:bg-red-500/10 hover:text-red-500"
                          aria-label={`Remove ${cat.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <div className="panel-surface rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] text-[var(--panel-accent-deep)]">
                <MessageSquare className="h-4 w-4" />
              </span>
              <span className="panel-status-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Live
              </span>
            </div>
            <p className="mt-4 text-xs font-medium text-[var(--panel-muted)]">
              Currently open
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-[var(--panel-ink)]">
              {config.open_ticket_count} {config.open_ticket_count === 1 ? "ticket" : "tickets"}
            </p>
          </div>

          <section className="panel-surface rounded-2xl p-5">
            <div className="flex items-center gap-2.5">
              <Zap className="h-4 w-4 text-[var(--panel-accent-deep)]" />
              <h2 className="text-[15px] font-semibold text-[var(--panel-ink)]">
                Panel appearance
              </h2>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] p-3.5">
                <p className="text-[11px] font-medium text-[var(--panel-muted)]">Title</p>
                <p className="mt-1 truncate text-[13px] font-medium text-[var(--panel-ink)]">
                  {config.embed.title || "Support department"}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] p-3.5">
                <p className="text-[11px] font-medium text-[var(--panel-muted)]">Description</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--panel-ink)]">
                  {config.embed.description || "Open a ticket below to talk to our staff."}
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              className="mt-4 h-10 w-full gap-2"
              onClick={() => setEditingEmbed({...config.embed})}
            >
              <Mail className="h-4 w-4" />
              Edit appearance
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}
