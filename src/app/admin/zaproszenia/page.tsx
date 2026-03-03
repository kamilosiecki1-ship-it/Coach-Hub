"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Mail, Plus, Loader2, RefreshCw, Trash2, Copy, CheckCircle2, Clock, XCircle,
  Link as LinkIcon, ShieldAlert, ShieldCheck,
} from "lucide-react";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invite {
  id: string;
  email: string | null;
  role: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

interface NewInviteResult {
  invite: Invite;
  token: string;
  registrationLink: string;
  emailSent: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inviteStatus(invite: Invite): "used" | "expired" | "active" {
  if (invite.usedAt) return "used";
  if (new Date(invite.expiresAt) < new Date()) return "expired";
  return "active";
}

function StatusBadge({ invite }: { invite: Invite }) {
  const s = inviteStatus(invite);
  if (s === "used") return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800">
      <CheckCircle2 className="w-3 h-3" />Wykorzystane
    </span>
  );
  if (s === "expired") return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800">
      <XCircle className="w-3 h-3" />Wygasłe
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
      <Clock className="w-3 h-3" />Aktywne
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  return role === "ADMIN" ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300">
      <ShieldAlert className="w-3 h-3" />Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
      <ShieldCheck className="w-3 h-3" />Coach
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminZaproseniaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("COACH");
  const [formTtl, setFormTtl] = useState("7");
  const [creating, setCreating] = useState(false);

  // Result dialog
  const [resultOpen, setResultOpen] = useState(false);
  const [result, setResult] = useState<NewInviteResult | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Invite | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/logowanie");
    if (status === "authenticated" && session.user.role !== "ADMIN") router.replace("/pulpit");
  }, [status, session, router]);

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invites");
      if (res.ok) setInvites(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchInvites();
  }, [status, fetchInvites]);

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreating(true);
    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formEmail || null, role: formRole, ttlDays: formTtl }),
    });
    setCreating(false);
    if (!res.ok) {
      const err = await res.json();
      toast({ title: "Błąd", description: err.error ?? "Nie udało się utworzyć zaproszenia.", variant: "destructive" });
      return;
    }
    const data: NewInviteResult = await res.json();
    setResult(data);
    setCreateOpen(false);
    setFormEmail("");
    setFormRole("COACH");
    setFormTtl("7");
    setResultOpen(true);
    fetchInvites();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/invites/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const err = await res.json();
      toast({ title: "Błąd", description: err.error ?? "Nie udało się usunąć zaproszenia.", variant: "destructive" });
    } else {
      toast({ title: "Usunięto", description: "Zaproszenie zostało usunięte." });
      setDeleteTarget(null);
      fetchInvites();
    }
  };

  const copyToClipboard = (text: string, label = "Skopiowano") => {
    navigator.clipboard.writeText(text).then(() =>
      toast({ title: label, description: "Tekst skopiowany do schowka." })
    );
  };

  // ─── KPIs ────────────────────────────────────────────────────────────────────
  const active = invites.filter((i) => inviteStatus(i) === "active").length;
  const used = invites.filter((i) => inviteStatus(i) === "used").length;
  const expired = invites.filter((i) => inviteStatus(i) === "expired").length;

  if (status === "loading") {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full py-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (status !== "authenticated" || session.user.role !== "ADMIN") return null;

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Zaproszenia</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Zapraszaj nowych coachów do systemu</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchInvites} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 mr-1.5", loading && "animate-spin")} />
              Odśwież
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nowe zaproszenie
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Aktywne", value: active, color: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300" },
            { label: "Wykorzystane", value: used, color: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" },
            { label: "Wygasłe", value: expired, color: "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400" },
          ].map((k) => (
            <div key={k.label} className={cn("rounded-2xl border px-5 py-4", k.color)}>
              <p className="text-2xl font-bold">{k.value}</p>
              <p className="text-xs mt-0.5 opacity-70">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Invites table */}
        <div className="bg-white dark:bg-card rounded-2xl border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 border-b bg-slate-50 dark:bg-slate-800/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Email</span>
            <span>Rola</span>
            <span>Status</span>
            <span>Utworzone</span>
            <span>Wygasa</span>
            <span></span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-16">
              <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Brak zaproszeń</p>
              <p className="text-xs text-muted-foreground mt-1">Utwórz zaproszenie, aby zaprosić nowego coacha.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <p className="text-sm truncate">
                    {invite.email ?? <span className="text-muted-foreground italic">Dowolny email</span>}
                  </p>
                  <RoleBadge role={invite.role} />
                  <StatusBadge invite={invite} />
                  <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(invite.createdAt)}</p>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(invite.expiresAt)}</p>
                  <button
                    onClick={() => setDeleteTarget(invite)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors"
                    title="Usuń zaproszenie"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Create invite dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nowe zaproszenie</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inv-email">Email (opcjonalnie)</Label>
              <Input
                id="inv-email"
                type="email"
                placeholder="coach@firma.pl — zostaw puste dla dowolnego emaila"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Jeśli podasz email, zaproszenie będzie ważne tylko dla tego adresu.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rola</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COACH">Coach</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-ttl">Ważne przez (dni)</Label>
                <Input
                  id="inv-ttl"
                  type="number"
                  min="1"
                  max="90"
                  value={formTtl}
                  onChange={(e) => setFormTtl(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Anuluj</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Utwórz zaproszenie"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Result dialog (show link once) ─────────────────────────────────── */}
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Zaproszenie utworzone</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            {result?.emailSent ? (
              <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Email z zaproszeniem został wysłany na adres <strong>{result.invite.email}</strong>.</span>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 rounded-xl text-sm">
                <LinkIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Nie podano adresu email. Skopiuj link i przekaż go ręcznie. Po zamknięciu tego okna link nie będzie ponownie widoczny.</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Link rejestracyjny</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={result?.registrationLink ?? ""}
                  className="text-xs font-mono bg-slate-50 dark:bg-slate-800"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(result?.registrationLink ?? "", "Link skopiowany")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {result?.emailSent && (
                <p className="text-xs text-muted-foreground">Link dostępny też w emailu. Możesz go skopiować jako zapasowy.</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Wygasa: <strong>{result ? formatDateTime(result.invite.expiresAt) : "—"}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setResultOpen(false)}>Zamknij</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete confirm dialog ───────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Usuń zaproszenie</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              {deleteTarget?.email
                ? <>Zaproszenie dla <strong className="text-foreground">{deleteTarget.email}</strong> zostanie usunięte.</>
                : "To zaproszenie zostanie usunięte."}
            </p>
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
              Jeśli zaproszenie jest aktywne, osoby posiadające link nie będą mogły się zarejestrować.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Anuluj</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Usuń"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
