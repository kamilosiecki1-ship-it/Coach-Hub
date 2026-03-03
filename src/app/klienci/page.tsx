"use client";
import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Users, Building2, Briefcase, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn, STAGE_OPTIONS } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface Client {
  id: string;
  name: string;
  company?: string | null;
  role?: string | null;
  stage: string;
  generalNote?: string | null;
  updatedAt: string;
  _count?: { sessions: number };
}

const STAGE_COLORS: Record<string, string> = {
  "Wstęp":      "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
  "Onboarding": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  "W trakcie":  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  "Zakończony": "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  "Zawieszony": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
};

export default function KlienciPage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", company: "", role: "", stage: "Wstęp", generalNote: "",
  });

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (stage !== "all") params.set("stage", stage);
    const res = await fetch(`/api/klienci?${params}`);
    const data = await res.json();
    setClients(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search, stage]);

  useEffect(() => {
    const t = setTimeout(fetchClients, 300);
    return () => clearTimeout(t);
  }, [fetchClients]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: "Błąd", description: "Imię i nazwisko jest wymagane.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/klienci", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: "Klient dodany", description: `${form.name} został dodany.` });
      setDialogOpen(false);
      setForm({ name: "", company: "", role: "", stage: "Wstęp", generalNote: "" });
      fetchClients();
    } else {
      const err = await res.json();
      toast({ title: "Błąd", description: err.error ?? "Nie udało się dodać klienta.", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Klienci</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Zarządzaj swoimi klientami coachingowymi.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Nowy klient
          </Button>
        </div>

        {/* Search + filter */}
        <div className="bg-white dark:bg-card rounded-2xl border p-4 flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po nazwie, firmie, roli..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Wszystkie etapy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie etapy</SelectItem>
              {STAGE_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Client list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Brak klientów</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Dodaj pierwszego klienta, aby zacząć.</p>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Nowy klient
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => {
              const stageColor = STAGE_COLORS[client.stage] ?? "bg-slate-100 text-slate-600 border-slate-200";
              return (
                <Link key={client.id} href={`/klienci/${client.id}`}>
                  <div className="bg-white dark:bg-card rounded-2xl border px-5 py-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-semibold text-base shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm leading-none">{client.name}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {client.role && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />{client.role}
                          </span>
                        )}
                        {client.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />{client.company}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {client._count?.sessions ?? 0} sesji
                      </span>
                      <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full border", stageColor)}>
                        {client.stage}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Add client dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dodaj klienta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Imię i nazwisko *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jan Kowalski" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="company">Firma</Label>
                <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="ABC Sp. z o.o." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rola / stanowisko</Label>
                <Input id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Menedżer" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Etap procesu</Label>
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="generalNote">Notatka ogólna</Label>
              <Textarea
                id="generalNote"
                value={form.generalNote}
                onChange={(e) => setForm({ ...form, generalNote: e.target.value })}
                placeholder="Kontekst, cel procesu, kluczowe informacje o kliencie..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anuluj</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dodaj klienta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
