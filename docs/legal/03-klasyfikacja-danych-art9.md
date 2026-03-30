# Klasyfikacja danych — art. 9 RODO — Session Lab

**Data analizy:** 2026-03-30
**Dotyczy:** SESAA-2 (D+10, deliverable 3)
**Wniosek główny:** ZNACZĄCE RYZYKO — notatki z sesji coachingowych MOGĄ stanowić dane szczególnej kategorii (art. 9 RODO). Wymaga ostrożności prawnej i wdrożenia dodatkowych zabezpieczeń.

---

## 1. Treść art. 9 RODO — dane szczególnej kategorii

Art. 9 ust. 1 RODO zakazuje przetwarzania danych ujawniających lub dotyczących:
- pochodzenia rasowego lub etnicznego
- poglądów politycznych
- przekonań religijnych lub światopoglądowych
- przynależności do związków zawodowych
- **danych genetycznych**
- **danych biometrycznych** (w celu jednoznacznej identyfikacji)
- **danych dotyczących zdrowia**
- **danych dotyczących życia seksualnego lub orientacji seksualnej**

**Kluczowe dla Session Lab:** dane dotyczące **zdrowia** (w tym zdrowia psychicznego).

---

## 2. Analiza: czy notatki z sesji coachingowych to dane art. 9?

### Odpowiedź: ZALEŻY — i to jest problem

**Coaching nie jest psychoterapią**, ale w praktyce sesje coachingowe często obejmują:

| Scenariusz | Kwalifikacja prawna | Uzasadnienie |
|------------|---------------------|--------------|
| Notatki czysto zawodowe (cele biznesowe, kompetencje) | Dane zwykłe | Brak odniesień do zdrowia/psychiki |
| Notatki o stanach emocjonalnych klienta (stres, lęk, wypalenie) | **Potencjalnie art. 9** | Motyw 35 RODO: dane o zdrowiu = dane dotyczące stanu fizycznego lub psychicznego |
| Notatki o zaburzeniach psychicznych klienta | **Art. 9** | Jednoznaczne dane zdrowotne |
| Transkrypcje sesji ze spontanicznymi ujawnieniami zdrowia | **Potencjalnie art. 9** | Motyw 35: "wszelkie informacje dotyczące stanu zdrowia" |
| Informacje o leczeniu psychiatrycznym lub terapii | **Art. 9** | Jednoznaczne |

### Orzecznictwo i wykładnia EROD:

Europejska Rada Ochrony Danych (EROD) stoi na stanowisku, że **definicja danych zdrowotnych powinna być interpretowana szeroko** (motyw 35 RODO). Obejmuje informacje o stanie psychicznym, emocjonalnym, historii chorób, lekach, terapii.

**Wniosek: W typowych sesjach coachingowych istnieje realne ryzyko, że notatki ZAWIERAJĄ dane art. 9. Session Lab nie ma kontroli nad tym, co coach wpisuje w polach notesMd, planMd, scratchpadMd, summaryMd.**

---

## 3. Konsekwencje prawne jeśli dane = art. 9

### 3.1 Wymagana podstawa prawna (art. 9 ust. 2)

Dla przetwarzania danych art. 9 wymagana jest JEDNA z podstaw:

| Podstawa | Zastosowanie dla Session Lab | Ocena |
|----------|------------------------------|-------|
| **Art. 9(2)(a) — wyraźna zgoda** | Zgoda coachee na przetwarzanie przez Session Lab i AI | ✅ Rekomendowana podstawa |
| Art. 9(2)(b) — obowiązki pracownicze | Nie dotyczy | ❌ |
| Art. 9(2)(c) — ochrona żywotnych interesów | Sytuacja awaryjna | ❌ Nie dotyczy standardowo |
| Art. 9(2)(f) — dochodzenie/obrona roszczeń | Nie dotyczy | ❌ |
| Art. 9(2)(h) — opieka zdrowotna | Coaching ≠ opieka zdrowotna | ❌ Ryzykowna podstawa |

**Rekomendacja: Wyraźna zgoda coachee (art. 9(2)(a)) jako podstawa — wymaga wdrożenia szablonu zgody (deliverable 10).**

### 3.2 Dodatkowe obowiązki przy danych art. 9

1. **Ocena Skutków dla Ochrony Danych (DPIA/DSOD)** — jeśli przetwarzanie danych zdrowotnych na dużą skalę, wymagana DPIA przed rozpoczęciem przetwarzania (art. 35 RODO)
2. **Wyznaczenie Inspektora Ochrony Danych (IOD/DPO)** — prawdopodobnie wymagane jeśli przetwarzanie danych art. 9 na dużą skalę
3. **Rejestr czynności przetwarzania (RCP)** — obowiązkowy (art. 30 RODO), musi uwzględniać dane art. 9
4. **Wzmocnione środki bezpieczeństwa** (art. 32(1)) — szyfrowanie, pseudonimizacja, ograniczenie dostępu

---

## 4. Podział odpowiedzialności: coach jako administrator

**Kluczowe ustalenie architektury prawnej:**

```
[Klient coacha (coachee)] → [Coach (Administrator danych)] → [Session Lab (Procesor)]
```

- **Coach = Administrator danych** swoich klientów (decyduje o celach i sposobach przetwarzania)
- **Session Lab = Procesor** (przetwarza na polecenie i w imieniu coacha)
- Coach jest odpowiedzialny za uzyskanie zgody coachee na przetwarzanie (w tym przez Session Lab i AI)

**Implikacja:** Session Lab nie musi uzyskiwać zgody od coachees bezpośrednio (to obowiązek coacha), ale musi:
1. Dostarczyć coachowi wzorzec zgody i klauzuli informacyjnej
2. Poinformować coacha o przetwarzaniu przez AI (OpenAI)
3. Zagwarantować w DPA z coachem, że coach uzyska wymagane zgody

---

## 5. Strategia mitygacji ryzyka

### Opcja A — Pozycjonowanie "brak danych art. 9" (ryzykowna)

Argumentacja: "Session Lab to narzędzie do notatek biznesowych, nie przetwarza danych zdrowotnych."

**Problem:** Coach może wpisywać cokolwiek. Session Lab nie ma kontroli nad treścią. Regulatorzy (np. UODO) mogą zakwestionować to stanowisko.

**Ocena: NIEZALECANA — ekspozycja prawna zbyt wysoka.**

### Opcja B — Pełna zgodność z art. 9 (rekomendowana)

1. W Regulaminie ToS: **zakaz wprowadzania danych art. 9 bez uzyskania wyraźnej zgody coachee**
2. Dostarczyć wzorzec zgody coachee (deliverable 10)
3. Informacja w Polityce Prywatności o możliwości przetwarzania danych szczególnej kategorii
4. Pseudonimizacja przed wysyłką do OpenAI (patrz doc. 01)
5. Rejestr czynności przetwarzania uwzględniający art. 9
6. Rozważyć DPIA (assessment) — rekomendowane przed 1000 użytkownikami

---

## 6. Obowiązek DPIA — kiedy wymagana

DPIA wymagana gdy przetwarzanie "prawdopodobnie skutkuje wysokim ryzykiem" (art. 35 RODO). Kryteria EROD:

| Kryterium | Obecność w Session Lab |
|-----------|----------------------|
| Ocena lub punktowanie | Tak (retrospektywy AI) |
| Decyzje automatyczne z istotnymi skutkami | Nie (AI wspomaga, nie decyduje) |
| Systematyczne monitorowanie | Tak (dokumentacja sesji) |
| Dane wrażliwe (art. 9) | Potencjalnie tak |
| Przetwarzanie na dużą skalę | Przy skalowaniu — tak |
| Łączenie zbiorów | Tak (klient + sesje + AI) |
| Dane osób wrażliwych | Nie wprost |
| Nowe rozwiązania technologiczne | Tak (AI) |
| Transfer do krajów trzecich | Tak (OpenAI, Vercel — USA) |

**Ocena:** Spełnione minimum 4-5 kryteriów z 9. EROD rekomenduje DPIA przy 2+ kryteriach.

**Rekomendacja: Przeprowadzić DPIA przed launchem komercyjnym lub w ciągu 30 dni od niego.** DPIA jest dokumentem wewnętrznym, nie wymaga zgłoszenia do UODO (chyba że ujawnia wysokie ryzyko niemożliwe do mitygacji).

---

## 7. Rejestr Czynności Przetwarzania (RCP)

Session Lab musi prowadzić RCP (art. 30 RODO). Zapis dla danych z sesji:

| Pole | Wartość |
|------|---------|
| Administrator | Coach (imię, nazwisko, email) |
| Cel przetwarzania | Prowadzenie i dokumentowanie procesu coachingowego |
| Kategorie osób | Klienci coachów (coachees) |
| Kategorie danych | Dane identyfikacyjne, dane o stanie emocjonalnym/psychicznym (potencjalnie art. 9) |
| Odbiorcy | Session Lab (procesor), OpenAI Inc. (podprocesor AI), Supabase Inc. (podprocesor infrastruktura) |
| Transfer do krajów trzecich | USA — SCC (OpenAI, Supabase, Vercel) |
| Planowany termin usunięcia | Na żądanie coacha lub po zamknięciu konta |
| Środki bezpieczeństwa | Szyfrowanie AES-256, TLS 1.3, pseudonimizacja AI, RLS |

---

*Dokument przygotowany przez: Head of Legal, Session Lab*
*Wersja: 1.0 — 2026-03-30*
*Wymaga: Decyzji CEO w sprawie pozycji prawnej (Opcja A vs B) przed finalizacją dokumentów*
