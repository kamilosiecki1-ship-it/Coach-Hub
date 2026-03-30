# Specyfikacja techniczna — Usunięcie danych konta Coacha (RODO art. 17)

**Dotyczy:** SESAA-2 (D+14, deliverable 9)
**Adresat:** CTO / Engineering Team
**Data:** 2026-03-30
**Priorytet:** KRYTYCZNE — wymagane przed launchem komercyjnym

---

## 1. Kontekst prawny

Art. 17 RODO ("prawo do bycia zapomnianym") nakłada obowiązek usunięcia danych osobowych na żądanie podmiotu danych, chyba że istnieją prawnie uzasadnione podstawy do dalszego przetwarzania.

**Dla Session Lab:**
- Coach może żądać usunięcia swojego konta i wszystkich powiązanych danych
- Session Lab jako podmiot przetwarzający musi usunąć dane Coachees na żądanie Coacha (w ramach DPA)
- Termin realizacji: **30 dni** od żądania (RODO)
- Po usunięciu: potwierdzenie mailowe do wnioskodawcy

---

## 2. Schemat danych do usunięcia

Na podstawie analizy `prisma/schema.prisma` — poniżej kompletna lista tabel i rekordów do usunięcia przy usuwaniu konta Coacha.

### 2.1 Kaskada usunięcia (już skonfigurowana w schemacie Prisma)

Schemat Prisma zawiera relacje z `onDelete: Cascade`. Usunięcie `User` powinno kaskadowo usunąć:

```
User (id: userId)
├── Client[] (onDelete: Cascade)
│   ├── Session[] (onDelete: Cascade)
│   │   ├── SessionOffboarding (onDelete: Cascade)
│   │   └── MentorConversation[] via contextSessionId (onDelete: SetNull — NIE usuwa!)
│   ├── Retrospective[] (onDelete: Cascade)
│   └── MentorConversation[] via clientId (onDelete: SetNull — NIE usuwa!)
├── KnowledgeTool[] (onDelete: Cascade)
└── UserToolPreference[] (onDelete: Cascade)
```

**⚠️ UWAGA — NIEKOMPLETNA KASKADA:**

Tabele, których kaskada NIE usuwa automatycznie, a które zawierają dane użytkownika:

| Tabela | Problem | Pole | Działanie |
|--------|---------|------|-----------|
| `MentorConversation` | `clientId` → SetNull (klient pozostaje null, ale wpis zostaje!) | `userId` | Musi być usunięty osobno wg `userId` |
| `MentorMessage` | Powiązany z MentorConversation, ale ona sama nie jest usuwana | przez conversationId | Usunięty po usunięciu MentorConversation |
| `Note` | Brak relacji do User przez Prisma! Zawiera `userId` jako String | `userId` | Musi być usunięty **explicite** |
| `AiUsageEvent` | Brak relacji do User przez Prisma! Zawiera `userId` jako String | `userId` | Musi być usunięty **explicite** |

---

## 3. Wymagana sekwencja usunięcia

### Krok 1 — Usuń MentorConversation z userId (i ich wiadomości przez kaskadę)

```sql
-- Krok 1: Usuń wszystkie konwersacje mentora powiązane z użytkownikiem
-- (MentorMessage usunięte przez CASCADE na conversationId)
DELETE FROM "MentorConversation" WHERE "userId" = :userId;
```

### Krok 2 — Usuń Note z userId

```sql
-- Krok 2: Usuń wszystkie notatki użytkownika
DELETE FROM "Note" WHERE "userId" = :userId;
```

### Krok 3 — Usuń AiUsageEvent z userId

```sql
-- Krok 3: Usuń logi użycia AI powiązane z użytkownikiem
DELETE FROM "AiUsageEvent" WHERE "userId" = :userId;
```

### Krok 4 — Usuń User (kaskadowo usuwa resztę)

```sql
-- Krok 4: Usuń użytkownika (CASCADE usunie Client, Session, SessionOffboarding,
-- Retrospective, KnowledgeTool, UserToolPreference)
DELETE FROM "User" WHERE "id" = :userId;
```

### Krok 5 — Weryfikacja

```sql
-- Weryfikacja: sprawdź czy nie zostały żadne dane orphaned
SELECT COUNT(*) FROM "MentorConversation" WHERE "userId" = :userId;
SELECT COUNT(*) FROM "Note" WHERE "userId" = :userId;
SELECT COUNT(*) FROM "AiUsageEvent" WHERE "userId" = :userId;
-- Powinny zwrócić 0
```

---

## 4. Implementacja w Next.js / Prisma

### Endpoint API

```typescript
// src/app/api/account/delete/route.ts
// POST /api/account/delete

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Transakcja atomowa — wszystko albo nic
  await prisma.$transaction([
    // Krok 1: MentorConversation (wiadomości usuwane przez CASCADE)
    prisma.mentorConversation.deleteMany({ where: { userId } }),

    // Krok 2: Note (brak relacji Prisma → explicit delete)
    prisma.note.deleteMany({ where: { userId } }),

    // Krok 3: AiUsageEvent (brak relacji Prisma → explicit delete)
    prisma.aiUsageEvent.deleteMany({ where: { userId } }),

    // Krok 4: User (CASCADE usunie Client → Session → SessionOffboarding,
    //          Retrospective, KnowledgeTool, UserToolPreference)
    prisma.user.delete({ where: { id: userId } }),
  ]);

  // Invalidate session
  // (implementacja zależy od używanego auth library)

  // Wyślij email potwierdzający usunięcie
  // await sendAccountDeletionConfirmationEmail(userEmail);

  return NextResponse.json({ success: true, message: 'Konto zostało usunięte.' });
}
```

### Uwagi implementacyjne

1. **Transakcja:** Całość musi być w jednej transakcji Prisma (`$transaction`) — jeśli którykolwiek krok zawiedzie, dane nie są częściowo usunięte.

2. **Backup przed usunięciem (opcjonalne):** Rozważyć soft-delete lub 30-dniowy "cooling period" — Coach może się rozmyślić. Jeśli wdrożone: dane oznaczone jako `deletedAt` i faktycznie usuwane po 30 dniach przez cron job.

3. **Hasło/potwierdzenie:** Przed usunięciem wymagać potwierdzenia hasłem lub kodu 2FA — chroni przed przypadkowym usunięciem.

4. **Export danych:** Przed usunięciem zaproponować pobranie pełnego eksportu danych (JSON/CSV) — realizacja prawa do przenoszenia danych (art. 20 RODO).

5. **Usunięcie z Supabase Auth:** Jeśli używana jest Supabase Auth (nie tylko Prisma), usunąć również profil z `auth.users` przez Supabase Admin API.

---

## 5. Usunięcie danych pojedynczego Coachee (bez usuwania konta Coacha)

Coach może również żądać usunięcia danych konkretnego Coachee (np. na żądanie Coachee).

### Sekwencja dla usunięcia klienta (Client):

```sql
-- Usuń konwersacje mentora powiązane z klientem (przez clientId)
-- Uwaga: MentorConversation.clientId → SetNull, więc nie są usuwane automatycznie
DELETE FROM "MentorConversation" WHERE "clientId" = :clientId;

-- Usuń klienta (CASCADE usunie Session, SessionOffboarding, Retrospective)
DELETE FROM "Client" WHERE "id" = :clientId AND "userId" = :coachUserId;
-- (AND userId zapewnia, że coach usuwa tylko swojego klienta)
```

### Prisma (transakcja):

```typescript
await prisma.$transaction([
  prisma.mentorConversation.deleteMany({ where: { clientId } }),
  prisma.client.delete({ where: { id: clientId, userId: coachUserId } }),
]);
```

---

## 6. Retencja danych — wyjątki prawne

Następujące dane mogą być zatrzymane pomimo żądania usunięcia:

| Dane | Podstawa zatrzymania | Okres |
|------|---------------------|-------|
| Dane rozliczeniowe (faktury, kwoty) | Art. 86 Ordynacji podatkowej — obowiązek podatkowy | 5 lat od końca roku podatkowego |
| Logi bezpieczeństwa (adresy IP, naruszenia) | Uzasadniony interes (bezpieczeństwo, dochodzenie roszczeń) | Do 12 miesięcy |
| Korespondencja mailowa dot. roszczeń | Dochodzenie/obrona roszczeń | Do przedawnienia roszczeń (3 lata) |

Przy usunięciu konta Coach powiadamiany o tym, co zostaje zatrzymane i dlaczego.

---

## 7. Procedura obsługi żądania usunięcia

### Żądanie przez UI (preferowane):
1. Coach klika "Usuń konto" w Ustawieniach
2. Wyświetlenie informacji co zostanie usunięte (i co zatrzymane)
3. Potwierdzenie hasłem
4. Opcja eksportu danych
5. Usunięcie (natychmiastowe lub po 30-dniowym cooling period)
6. Email potwierdzający

### Żądanie przez email (hello@sessionlab.app):
1. Weryfikacja tożsamości (email z konta)
2. Potwierdzenie zakresu żądania
3. Realizacja w ciągu **30 dni**
4. Potwierdzenie mailowe usunięcia

---

## 8. Testowanie (przed launchem)

Wymagane testy przed launchem:

- [ ] Test usunięcia konta z pełnymi danymi (User + wszystkie relacje)
- [ ] Weryfikacja brak danych orphaned po usunięciu
- [ ] Test usunięcia pojedynczego klienta (Coachee)
- [ ] Test transakcyjny — co się dzieje gdy jeden krok zawiedzie
- [ ] Test że soft-delete działa (jeśli wdrożone)

---

*Specyfikacja przygotowana przez: Head of Legal, Session Lab*
*Adresat: CTO — Engineering Team*
*Wersja: 1.0 — 2026-03-30*
