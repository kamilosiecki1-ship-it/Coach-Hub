# Weryfikacja DPA z Supabase — Session Lab

**Data analizy:** 2026-03-30
**Dotyczy:** SESAA-2 (D+7, deliverable 2)
**Status:** SPEŁNIA wymogi RODO — wymaga formalnego podpisania DPA + wyboru regionu EU

---

## 1. Stan obecny — Supabase jako podmiot przetwarzający

### Weryfikacja wymagań art. 28 RODO:

| Wymaganie art. 28 RODO | Status Supabase |
|------------------------|-----------------|
| Pisemna umowa powierzenia | ✅ DPA dostępne i podpisywalne |
| Przetwarzanie tylko na udokumentowane polecenie administratora | ✅ Potwierdzono w DPA |
| Zachowanie poufności | ✅ Potwierdzono w DPA |
| Wdrożenie odpowiednich środków technicznych (art. 32) | ✅ SOC 2 Type II, ISO 27001 (w toku) |
| Angażowanie podprocesorów tylko za zgodą | ✅ Lista podprocesorów dostępna |
| Pomoc przy realizacji praw podmiotów danych | ✅ Potwierdzone w DPA |
| Usunięcie/zwrot danych po zakończeniu | ✅ Potwierdzone |
| Udostępnianie informacji i audyt | ✅ Potwierdzone |

---

## 2. Jak podpisać DPA z Supabase

### Krok 1 — Plan
DPA dostępne od planu **Pro** ($25/mies.) i wyżej. Free Plan NIE oferuje DPA.

**Dla Session Lab: Wymagane minimum Pro Plan przed launchem komercyjnym.**

### Krok 2 — Podpisanie DPA
1. Zaloguj się na `app.supabase.com`
2. Organizacja → Settings → Legal
3. Kliknij "Sign DPA"
4. Wpisz dane organizacji (pełna nazwa, adres, kraj, NIP)
5. DPA podpisywane elektronicznie (akceptacja klikaniem = ważna forma pod art. 28 RODO)
6. Pobierz PDF do archiwum

### Krok 3 — Wybór regionu danych
**KRYTYCZNE dla RODO:** Upewnij się, że projekt jest w regionie EU.

W panelu Supabase przy tworzeniu projektu lub sprawdzeniu istniejącego:
- Zalecany region: **eu-central-1 (Frankfurt, Germany)**
- Alternatywa: **eu-west-1 (Ireland)**
- Sprawdź: Settings → Project Settings → General → Region

Jeśli projekt jest w US (us-east-1 itp.) — **konieczna migracja przed launchem**.

---

## 3. Standard Contractual Clauses (SCC)

Supabase (Supabase Inc., Delaware, USA) przetwarza dane jako podmiot przetwarzający. Dla transferu danych UE → USA wymagane są SCC (mechanizm transferu danych na podstawie decyzji wykonawczej UE).

**Status:** Supabase DPA zawiera SCCs automatycznie dla klientów z EOG/UK. Weryfikacja:
- Standardowe DPA Supabase obejmuje Module 2 SCCs (Controller → Processor) dla transferu EU-US
- Obejmuje Annex I (opis przetwarzania), Annex II (środki techniczne), Annex III (subprocesory)

---

## 4. Lista podprocesorów Supabase (relevantnych)

Supabase korzysta z podprocesorów — pełna lista: `supabase.com/privacy`

Główni podprocesory istotni dla Session Lab:

| Podprocesor | Cel | Region |
|-------------|-----|--------|
| AWS (Amazon Web Services) | Infrastruktura bazodanowa | EU (Frankfurt) |
| Cloudflare | CDN, DDoS protection | EU PoP dostępne |
| DataDog | Monitoring | USA (SCC wymagane) |
| GitHub | Kod źródłowy | USA (SCC — nie dotyczą danych klientów) |

**Działanie dla Session Lab:** Zweryfikować listę podprocesorów i odzwierciedlić ją w DPA z coachami (jako lista dalszych podprocesorów Session Lab).

---

## 5. Środki techniczne i organizacyjne (art. 32 RODO)

Supabase wdraża m.in.:

- **Szyfrowanie at rest:** AES-256
- **Szyfrowanie in transit:** TLS 1.3
- **Backup:** Automatyczny, szyfrowany, retencja 7 dni (Pro), 30 dni (Pro+)
- **RLS (Row Level Security):** Dostępne — Session Lab POWINNO mieć wdrożone RLS na poziomie aplikacji (weryfikacja z CTO)
- **SOC 2 Type II:** Certyfikat dostępny (dotyczy infrastruktury)
- **Access logs:** Dostępne

**Weryfikacja z CTO:** Czy RLS jest wdrożone w schemacie Supabase? Jeśli Session Lab używa Prisma ORM + bezpośrednich zapytań (jak widać w kodzie), RLS może wymagać osobnej konfiguracji na poziomie Supabase.

---

## 6. Weryfikacja bazy danych

Na podstawie analizy schematu Prisma (`prisma/schema.prisma`), Session Lab przechowuje:

| Tabela | Zawartość | Kategoria danych |
|--------|-----------|-----------------|
| `User` | email, hasło (hash), imię coacha | Dane osobowe zwykłe |
| `Client` | imię, firma, rola klienta coacha | Dane osobowe zwykłe |
| `Session` | `notesMd`, `planMd`, `scratchpadMd`, `summaryMd`, transkrypcja | **Potencjalnie dane art. 9** |
| `SessionOffboarding` | szczegółowe dane sesji, transkrypcja | **Potencjalnie dane art. 9** |
| `MentorConversation` | konwersacje z AI mentorem | Dane osobowe zwykłe / art. 9 |
| `MentorMessage` | treść wiadomości | Może zawierać dane art. 9 |
| `Retrospective` | raporty retrospektywne | Może zawierać dane art. 9 |
| `Note` | notatki coacha | Może zawierać dane art. 9 |
| `AiUsageEvent` | logi użycia AI (bez treści) | Dane administracyjne |

---

## 7. Rekomendacja dla Session Lab

### Natychmiast (przed launchem):

1. ✅ **Upgrade do Pro Plan** jeśli jeszcze na Free
2. ✅ **Podpisać DPA** przez panel Supabase
3. ✅ **Zweryfikować region** — upewnić się, że jest eu-central-1 (Frankfurt)
4. ✅ **Sprawdzić RLS** z CTO — czy wdrożone? Jeśli nie, zaplanować wdrożenie
5. ✅ **Pobrać i archiwizować** podpisane DPA PDF

### Ocena końcowa

**Supabase SPEŁNIA** wymogi RODO jako podmiot przetwarzający, pod warunkiem:
- Formalnego podpisania DPA (kliknięcie w panel = ważna forma)
- Projektu na serwerach EU (Frankfurt lub Ireland)
- Wdrożonego Row Level Security

---

*Dokument przygotowany przez: Head of Legal, Session Lab*
*Wersja: 1.0 — 2026-03-30*
