# Weryfikacja DPA z OpenAI — Session Lab

**Data analizy:** 2026-03-30
**Dotyczy:** SESAA-2 (D+7, deliverable 1)
**Status:** Wymaga działania — standardowa umowa NIEWYSTARCZAJĄCA dla danych z sesji coachingowych

---

## 1. Stan obecny — standardowa umowa API OpenAI

### Co gwarantuje standardowa umowa (API Terms of Service):

| Kwestia | Stan |
|---------|------|
| Używanie danych klienta do trenowania modeli | **NIE** (domyślnie wyłączone od marca 2023) |
| Retencja danych na serwerach OpenAI | **30 dni** (domyślne) |
| Zero Data Retention (ZDR) | **NIE** — wymaga kontraktu Enterprise |
| Szyfrowanie w transit | Tak (TLS 1.2+) |
| Szyfrowanie at rest | Tak (AES-256) |
| DPA dla RODO | Tak — standardowe DPA OpenAI dostępne online |
| Standard Contractual Clauses (SCC) | Tak — dostępne w standardowym DPA |

### Gdzie pobrać standardowe DPA:
- Dostępne pod adresem: `https://openai.com/policies/data-processing-addendum`
- DPA podpisuje się elektronicznie przez panel OpenAI (Settings → Organization → Data Controls → DPA)

---

## 2. Problem: 30-dniowa retencja a dane z sesji coachingowych

**Kluczowy problem:** Notatki z sesji coachingowych mogą zawierać dane osobowe klientów coachów (coachees), w tym potencjalnie dane szczególnej kategorii (zdrowie psychiczne, art. 9 RODO). Domyślna 30-dniowa retencja przez OpenAI oznacza, że te dane są przechowywane przez OpenAI przez miesiąc, co:

1. Wymaga uwzględnienia OpenAI jako podprocesora w DPA między Session Lab a coachem
2. Wymaga poinformowania klientów coachów o przetwarzaniu przez OpenAI
3. Może wymagać podstawy prawnej art. 9(2) RODO, jeśli dane są danymi szczególnej kategorii

---

## 3. Zero Data Retention (ZDR) — co to jest i jak uzyskać

**ZDR (Zero Data Retention)** = OpenAI nie przechowuje danych wejściowych ani wyjściowych po zakończeniu żądania API. Dane przetwarzane są tylko w pamięci operacyjnej.

### Jak uzyskać ZDR:

**Opcja A — API bez retencji (dostępne dla wszystkich, tylko modele GPT-4o i podobne):**
- W panelu OpenAI: Settings → Organization → Data Controls → włącz opcję **"Disable model improvement for API data"** — to wyłącza użycie do trenowania
- Jednak **NIE** eliminuje 30-dniowej retencji do celów bezpieczeństwa

**Opcja B — Enterprise DPA z ZDR (rekomendowane dla danych wrażliwych):**
1. Kontakt: `privacy@openai.com` lub przez formularz Enterprise na `openai.com/enterprise`
2. Negocjacja Enterprise Agreement z ZDR
3. Koszt: wymaga minimalnych commitmentów (zazwyczaj $100k+/rok)
4. Czas: 4-8 tygodni negocjacji

**Opcja C — Obejście techniczne (rekomendowane krótkoterminowo):**
Przed wysłaniem danych do OpenAI API stosować **anonymizację/pseudonimizację**:
- Zastąp imiona klientów tokenami (np. `[KLIENT_001]`)
- Usuń nazwy firm, daty urodzenia, dane identyfikacyjne
- Wysyłaj do OpenAI tylko pseudonimizowane notatki
- Tabela deaonimizacji przechowywana wyłącznie w bazie Session Lab

---

## 4. Rekomendacja dla Session Lab (priorytety)

### Natychmiast (przed launchem):

1. **Podpisać standardowe DPA z OpenAI** — przez panel OpenAI Settings
2. **Wdrożyć pseudonimizację danych** przed wysyłką do API (patrz Opcja C powyżej) — eliminuje ryzyko bez potrzeby Enterprise Agreement
3. **Wyłączyć "model improvement"** w panelu OpenAI (nawet jeśli już wyłączone domyślnie dla API)

### Po launchу (jeśli skala uzasadnia koszty):

4. **Negocjować Enterprise DPA z ZDR** jeśli MRR przekroczy próg opłacalności (~$5k+/mies.)

### Alternatywa do OpenAI:

Warto rozważyć dostawców API z natywnym ZDR i siedzibą w UE:
- **Azure OpenAI** — GPT-4o dostępny, dane w regionach EU, ZDR dostępne w wybranych planach
- **Mistral AI** (France) — EU-based, GDPR-native, modele open-source

---

## 5. Działanie dla CTO — pseudonimizacja

Rekomendowana implementacja techniczna obejścia przed launchem:

```typescript
// Przed wywołaniem OpenAI API — pseudonimizuj dane klienta
function pseudonymizeClientContext(ctx: ClientContext): {
  anonymized: ClientContext;
  mapping: Record<string, string>
} {
  const mapping: Record<string, string> = {
    [ctx.name]: '[KLIENT]',
    // Rozszerz o inne PII: firma, rola jeśli identyfikowalne
  };

  // Zastąp w notesMd, planMd, scratchpadMd, summaryMd, transcript
  // Zwróć anonymized kontekst do wysłania do OpenAI
}
```

**Uwaga dla CTO:** Przed wysyłką każdego zapytania do OpenAI w `aiService.ts` — notatki powinny przejść przez pseudonimizację. Mapping (token → prawdziwe dane) NIE jest wysyłany do OpenAI, pozostaje tylko w bazie.

---

## 6. Podsumowanie ryzyka

| Scenariusz | Ryzyko RODO | Mitygacja |
|------------|-------------|-----------|
| Dane bez pseudonimizacji → OpenAI, bez ZDR | WYSOKIE — dane osobowe (i potencjalnie art. 9) w systemach US | Pseudonimizacja (Opcja C) |
| Dane pseudonimizowane → OpenAI, bez ZDR | NISKIE — anonimowe dane poza UE | Akceptowalne na start |
| Enterprise ZDR | MINIMALNE | Docelowe rozwiązanie |

---

*Dokument przygotowany przez: Head of Legal, Session Lab*
*Wymaga weryfikacji przez: CEO przed podjęciem decyzji o Enterprise DPA*
