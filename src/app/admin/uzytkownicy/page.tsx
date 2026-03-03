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
  Shield, Search, Users, Loader2, RefreshCw, ChevronLeft, ChevronRight,
  MoreHorizontal, KeyRound, Trash2, Ban, CheckCircle2, ShieldAlert, ShieldCheck,
  Eye, EyeOff, Copy, Zap,
} from "lucide-react";

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n > 0 ? String(n) : "—";
}
import { cn, formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isBlocked: boolean;
  createdAt: string;
  _count: { clients: number };
  tokensLast30Days: number;
  tokensTotal: number;
}

interface ListResponse {
  users: UserRow[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generatePassword(length = 16): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

function RoleBadge({ role }: { role: string }) {
  return role === "ADMIN" ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800">
      <ShieldAlert className="w-3 h-3" />
      Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
      <ShieldCheck className="w-3 h-3" />
      Coach
    </span>
  );
}

function StatusBadge({ isBlocked }: { isBlocked: boolean }) {
  return isBlocked ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800">
      <Ban className="w-3 h-3" />
      Zablokowany
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800">
      <CheckCircle2 className="w-3 h-3" />
      Aktywny
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  // List state
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Action target
  const [actionUser, setActionUser] = useState<UserRow | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Modals
  const [roleModal, setRoleModal] = useState(false);
  const [blockModal, setBlockModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);

  // Password modal state
  const [generatedPwd, setGeneratedPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/logowanie");
    if (status === "authenticated" && session.user.role !== "ADMIN") {
      router.replace("/pulpit");
    }
  }, [status, session, router]);

  // ─── Fetch users ─────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("page", String(page));
    try {
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [query, roleFilter, statusFilter, page]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers, status]);

  // ─── KPI counters ────────────────────────────────────────────────────────────
  const [kpi, setKpi] = useState({ total: 0, admins: 0, coaches: 0 });
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/admin/users?pageSize=1000")
      .then((r) => r.json())
      .then((d: ListResponse) => {
        const admins = d.users.filter((u) => u.role === "ADMIN").length;
        setKpi({ total: d.total, admins, coaches: d.total - admins });
      })
      .catch(() => {});
  }, [status, data]); // refresh kpi whenever list refreshes

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const callPatch = async (userId: string, body: Record<string, unknown>) => {
    setSaving(true);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json();
      toast({ title: "Błąd", description: err.error ?? "Operacja nieudana", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleChangeRole = async () => {
    if (!actionUser) return;
    const newRole = actionUser.role === "ADMIN" ? "COACH" : "ADMIN";
    const ok = await callPatch(actionUser.id, { role: newRole });
    if (ok) {
      toast({ title: "Rola zmieniona", description: `Rola użytkownika zmieniona na ${newRole}.` });
      setRoleModal(false);
      fetchUsers();
    }
  };

  const handleToggleBlock = async () => {
    if (!actionUser) return;
    const ok = await callPatch(actionUser.id, { isBlocked: !actionUser.isBlocked });
    if (ok) {
      toast({
        title: actionUser.isBlocked ? "Konto odblokowane" : "Konto zablokowane",
        description: actionUser.isBlocked
          ? "Użytkownik może się teraz zalogować."
          : "Użytkownik nie może się zalogować.",
      });
      setBlockModal(false);
      fetchUsers();
    }
  };

  const handleSetPassword = async () => {
    if (!actionUser || !generatedPwd) return;
    const ok = await callPatch(actionUser.id, { newPassword: generatedPwd });
    if (ok) {
      toast({ title: "Hasło ustawione", description: "Nowe hasło zostało zapisane." });
      setPasswordModal(false);
      setGeneratedPwd("");
    }
  };

  const handleDelete = async () => {
    if (!actionUser) return;
    setSaving(true);
    const res = await fetch(`/api/admin/users/${actionUser.id}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json();
      toast({ title: "Błąd", description: err.error ?? "Nie udało się usunąć konta", variant: "destructive" });
      return;
    }
    toast({ title: "Konto usunięte", description: `Konto ${actionUser.email} zostało usunięte.` });
    setDeleteModal(false);
    fetchUsers();
  };

  const openAction = (user: UserRow, action: "role" | "block" | "delete" | "password") => {
    setActionUser(user);
    setOpenMenu(null);
    if (action === "role") setRoleModal(true);
    if (action === "block") setBlockModal(true);
    if (action === "delete") setDeleteModal(true);
    if (action === "password") {
      setGeneratedPwd(generatePassword());
      setShowPwd(false);
      setPasswordModal(true);
    }
  };

  // ─── Loading / access guard render ───────────────────────────────────────────
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

  const totalPages = data ? Math.ceil(data.total / (data.pageSize || 20)) : 1;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Użytkownicy</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Zarządzaj kontami coachów</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-1.5", loading && "animate-spin")} />
            Odśwież
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Łącznie", value: kpi.total, color: "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300" },
            { label: "Administratorzy", value: kpi.admins, color: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300" },
            { label: "Coachowie", value: kpi.coaches, color: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300" },
          ].map((k) => (
            <div key={k.label} className={cn("rounded-2xl border px-5 py-4", k.color)}>
              <p className="text-2xl font-bold">{k.value}</p>
              <p className="text-xs mt-0.5 opacity-70">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="bg-white dark:bg-card rounded-2xl border p-4 flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po emailu lub nazwie..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Rola" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie role</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="COACH">Coach</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie statusy</SelectItem>
              <SelectItem value="active">Aktywny</SelectItem>
              <SelectItem value="blocked">Zablokowany</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users table */}
        <div className="bg-white dark:bg-card rounded-2xl border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1.2fr_auto_auto_auto_auto_auto_auto] gap-4 px-5 py-3 border-b bg-slate-50 dark:bg-slate-800/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Imię</span>
            <span>Email</span>
            <span>Rola</span>
            <span>Status</span>
            <span>Dołączył/a</span>
            <span className="text-right" title="Tokeny AI (30 dni)"><Zap className="w-3 h-3 inline mr-0.5" />30 dni</span>
            <span className="text-right" title="Tokeny AI łącznie"><Zap className="w-3 h-3 inline mr-0.5" />Łącznie</span>
            <span></span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.users.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Brak wyników</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.users.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-[1fr_1.2fr_auto_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-semibold text-sm shrink-0">
                      {(user.name ?? user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.name ?? <span className="text-muted-foreground italic">Brak nazwy</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{user._count.clients} klientów</p>
                    </div>
                  </div>

                  {/* Email */}
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>

                  {/* Role */}
                  <RoleBadge role={user.role} />

                  {/* Status */}
                  <StatusBadge isBlocked={user.isBlocked} />

                  {/* Date */}
                  <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(user.createdAt)}</p>

                  {/* Token usage */}
                  <p className="text-xs font-mono text-right text-muted-foreground">{fmtTokens(user.tokensLast30Days)}</p>
                  <p className="text-xs font-mono text-right text-muted-foreground">{fmtTokens(user.tokensTotal)}</p>

                  {/* Actions kebab */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {openMenu === user.id && (
                      <>
                        {/* Backdrop */}
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                        <div className="absolute right-0 top-9 z-20 w-52 bg-white dark:bg-card border rounded-xl shadow-lg py-1 text-sm">
                          <button
                            onClick={() => openAction(user, "role")}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                          >
                            <Shield className="w-3.5 h-3.5 text-purple-500" />
                            Zmień rolę
                          </button>
                          <button
                            onClick={() => openAction(user, "block")}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                          >
                            {user.isBlocked ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Ban className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            {user.isBlocked ? "Odblokuj konto" : "Zablokuj konto"}
                          </button>
                          <button
                            onClick={() => openAction(user, "password")}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                            Ustaw hasło tymczasowe
                          </button>
                          <div className="border-t my-1" />
                          <button
                            onClick={() => openAction(user, "delete")}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 transition-colors text-left"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Usuń konto
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              Wyświetlanie {(page - 1) * (data.pageSize ?? 20) + 1}–{Math.min(page * (data.pageSize ?? 20), data.total)} z {data.total}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-2">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Change Role Modal ─────────────────────────────────────────────────── */}
      <Dialog open={roleModal} onOpenChange={setRoleModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zmień rolę użytkownika</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Użytkownik: <span className="font-medium text-foreground">{actionUser?.email}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Aktualna rola: <RoleBadge role={actionUser?.role ?? "COACH"} />
            </p>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-400">
              {actionUser?.role === "ADMIN"
                ? "Czy na pewno chcesz zmienić rolę użytkownika z Admin na Coach?"
                : "Czy na pewno chcesz nadać temu użytkownikowi uprawnienia administratora?"}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleModal(false)}>Anuluj</Button>
            <Button onClick={handleChangeRole} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Zmień rolę"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Block / Unblock Modal ─────────────────────────────────────────────── */}
      <Dialog open={blockModal} onOpenChange={setBlockModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{actionUser?.isBlocked ? "Odblokuj konto" : "Zablokuj konto"}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Użytkownik: <span className="font-medium text-foreground">{actionUser?.email}</span>
            </p>
            <div className={cn(
              "border rounded-xl p-3 text-sm",
              actionUser?.isBlocked
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
            )}>
              {actionUser?.isBlocked
                ? "Konto zostanie odblokowane. Użytkownik będzie mógł się ponownie zalogować."
                : "Czy na pewno chcesz zablokować to konto? Użytkownik straci dostęp do aplikacji."}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockModal(false)}>Anuluj</Button>
            <Button
              variant={actionUser?.isBlocked ? "default" : "destructive"}
              onClick={handleToggleBlock}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : actionUser?.isBlocked ? "Odblokuj" : "Zablokuj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Set Temporary Password Modal ─────────────────────────────────────── */}
      <Dialog open={passwordModal} onOpenChange={setPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ustaw hasło tymczasowe</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              Użytkownik: <span className="font-medium text-foreground">{actionUser?.email}</span>
            </p>
            <div className="space-y-2">
              <Label>Nowe hasło</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={generatedPwd}
                    onChange={(e) => setGeneratedPwd(e.target.value)}
                    className="pr-8 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPwd);
                    toast({ title: "Skopiowano", description: "Hasło zostało skopiowane do schowka." });
                  }}
                  title="Kopiuj"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGeneratedPwd(generatePassword())}
                >
                  Losuj
                </Button>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-400">
              Skopiuj hasło i przekaż je użytkownikowi ręcznie. Po zamknięciu tego okna hasło nie będzie widoczne ponownie.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordModal(false)}>Anuluj</Button>
            <Button onClick={handleSetPassword} disabled={saving || !generatedPwd}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Zapisz hasło"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Modal ──────────────────────────────────────────────────────── */}
      <Dialog open={deleteModal} onOpenChange={setDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Usuń konto</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Użytkownik: <span className="font-medium text-foreground">{actionUser?.email}</span>
            </p>
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
              <strong>Uwaga:</strong> Usunięcie konta jest nieodwracalne. Wszystkie dane użytkownika (klienci, sesje, notatki) zostaną trwale usunięte.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal(false)}>Anuluj</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Usuń konto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
