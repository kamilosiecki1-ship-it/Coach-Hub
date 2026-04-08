# Polityka Prywatności Session Lab

**Wersja:** 1.0
**Data wejścia w życie:** 2026-03-30
**Ostatnia aktualizacja:** 2026-03-30

---

## 1. Administrator danych

Administratorem danych osobowych Coachów (Użytkowników) jest:

**Kamil Osiecki Digi M**
z siedzibą w ul. Gąsiorowskiego 30, 05-520 Konstancin-Jeziorna
NIP: 1231399959
Email: hello@sessionlab.app


---

## 2. Zakres Polityki Prywatności

Niniejsza Polityka Prywatności dotyczy wyłącznie **danych osobowych Coachów** (Użytkowników Platformy). Coaching session notes i dane Coachees przetwarzane przez Coachów za pośrednictwem Platformy objęte są osobną klauzulą informacyjną (dostępną na Platformie) — za ich przetwarzanie odpowiedzialny jest Coach jako administrator danych.

---

## 3. Kategorie danych i cele przetwarzania

### 3.1 Dane konta i rozliczeniowe

| Kategoria danych | Cel przetwarzania | Podstawa prawna | Okres przechowywania |
|-----------------|-------------------|-----------------|----------------------|
| Email, hasło (hash bcrypt), imię | Świadczenie usług Platformy, uwierzytelnienie | Art. 6(1)(b) RODO — wykonanie umowy | Czas trwania konta + 30 dni |
| Dane rozliczeniowe (imię/firma, adres, NIP) | Wystawienie faktur, rozliczenia | Art. 6(1)(c) — obowiązek prawny (przepisy podatkowe) | 5 lat od wystawienia faktury |
| Historia płatności | Obsługa reklamacji, obowiązki podatkowe | Art. 6(1)(c) — obowiązek prawny | 5 lat |

### 3.2 Dane z korzystania z Platformy

| Kategoria danych | Cel przetwarzania | Podstawa prawna | Okres przechowywania |
|-----------------|-------------------|-----------------|----------------------|
| Logi dostępu, adresy IP | Bezpieczeństwo, diagnostyka | Art. 6(1)(f) — uzasadniony interes (bezpieczeństwo) | 90 dni |
| Dane statystyki użycia (tokeny AI, endpointy) | Optymalizacja kosztów, limit użycia | Art. 6(1)(b) — wykonanie umowy | Czas trwania konta |
| Logi błędów (Sentry) | Diagnostyka i naprawianie błędów | Art. 6(1)(f) — uzasadniony interes | 30 dni |

### 3.3 Komunikacja

| Kategoria danych | Cel przetwarzania | Podstawa prawna | Okres przechowywania |
|-----------------|-------------------|-----------------|----------------------|
| Wiadomości do supportu | Obsługa zgłoszeń | Art. 6(1)(b) — wykonanie umowy | 2 lata od zamknięcia zgłoszenia |
| Email marketingowy (newsletter) | Marketing usług własnych | Art. 6(1)(a) — zgoda | Do cofnięcia zgody + 30 dni |

---

## 4. Odbiorcy danych

Dane Coachów mogą być przekazywane następującym kategoriom odbiorców:

### 4.1 Podprocesory infrastrukturalni

| Podmiot | Rola | Siedziba | Zabezpieczenie transferu |
|---------|------|----------|--------------------------|
| **Supabase Inc.** | Baza danych PostgreSQL | USA (dane w EU — Frankfurt) | SCCs, DPA |
| **Vercel Inc.** | Hosting aplikacji (Next.js) | USA (dane w EU) | SCCs, DPA |
| **Sentry Inc.** | Monitoring błędów | USA | SCCs, DPA |

### 4.2 Podprocesory AI (dla Funkcji AI)

| Podmiot | Rola | Siedziba | Zabezpieczenie transferu |
|---------|------|----------|--------------------------|
| **OpenAI Inc.** | Modele AI (GPT-4o) — przetwarzanie notatek sesji | USA | SCCs, DPA OpenAI |

**Uwaga:** OpenAI przetwarza dane wyłącznie w celu realizacji zapytań AI. OpenAI nie używa danych z API do trenowania modeli (per warunki API OpenAI). Domyślna retencja danych przez OpenAI: 30 dni.

### 4.3 Inne

- **Organy publiczne** — na żądanie uprawnionych organów (sądy, organy ścigania, UODO) na podstawie obowiązku prawnego
- **Doradcy prawni i audytorzy** — w zakresie niezbędnym do obsługi prawnej i audytów

---

## 5. Transfer danych do krajów trzecich

Dane mogą być przekazywane do państw trzecich (USA) w przypadku Supabase, Vercel, Sentry i OpenAI. Transfer odbywa się na podstawie **Standardowych Klauzul Umownych** (SCC) zatwierdzone przez Komisję Europejską.

---

## 6. Prawa Coacha (podmiotu danych)

Coach przysługują następujące prawa:

| Prawo | Treść | Sposób realizacji |
|-------|-------|-------------------|
| **Dostęp** (art. 15) | Informacja jakie dane przetwarzamy i ich kopia | Email do hello@sessionlab.app |
| **Sprostowanie** (art. 16) | Poprawienie nieprawidłowych danych | Ustawienia konta lub email |
| **Usunięcie** (art. 17) | Żądanie usunięcia danych ("prawo do bycia zapomnianym") | Usunięcie konta lub email |
| **Ograniczenie** (art. 18) | Ograniczenie przetwarzania w określonych przypadkach | Email do hello@sessionlab.app |
| **Przenoszenie** (art. 20) | Otrzymanie danych w formacie CSV/JSON | Email do hello@sessionlab.app — realizacja w 30 dni |
| **Sprzeciw** (art. 21) | Sprzeciw wobec przetwarzania na podstawie uzasadnionego interesu | Email do hello@sessionlab.app |
| **Cofnięcie zgody** | W dowolnym momencie (nie wpływa na zgodność dotychczasowego przetwarzania) | Ustawienia konta lub email |

Odpowiedź na żądanie: **30 dni** (możliwe przedłużenie do 90 dni przy złożonych żądaniach, z uprzednim powiadomieniem).

**Skarga do UODO:** Coach ma prawo wnieść skargę do Urzędu Ochrony Danych Osobowych (UODO), ul. Stawki 2, 00-193 Warszawa, [uodo.gov.pl](https://uodo.gov.pl).

---

## 7. Bezpieczeństwo danych

Session Lab wdraża następujące środki bezpieczeństwa:

- Szyfrowanie danych w tranzycie (TLS 1.3)
- Szyfrowanie danych w spoczynku (AES-256 — Supabase)
- Uwierzytelnienie z hashowaniem haseł (bcrypt)
- Kontrola dostępu do danych (uwierzytelnienie, autoryzacja)
- Monitoring i logi bezpieczeństwa
- Pseudonimizacja danych wysyłanych do AI [jeśli wdrożona]
- Regularne aktualizacje bezpieczeństwa

---

## 8. Cookies i technologie śledzące

### Cookies niezbędne (bez zgody):
- Sesja uwierzytelnienia (HttpOnly, Secure)

### Cookies analityczne (za zgodą):
- [Jeśli używane — wyspecyfikować narzędzie]

Session Lab nie korzysta z cookies śledzących lub marketingowych podmiotów trzecich.

---

## 9. Zmiany Polityki Prywatności

O zmianach niniejszej Polityki Coachowie zostaną powiadomieni drogą emailową z **14-dniowym wyprzedzeniem**.

---

## 10. Kontakt w sprawach danych osobowych

**Email:** hello@sessionlab.app
**Adres:** ul. Gąsiorowskiego 30, 05-520 Konstancin-Jeziorna
