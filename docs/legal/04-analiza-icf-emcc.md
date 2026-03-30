# Analiza ICF i EMCC — ograniczenia AI i wymogi transparentności

**Data analizy:** 2026-03-30
**Dotyczy:** SESAA-2 (D+10, deliverable 4)

---

## 1. ICF — International Coaching Federation

### Obowiązujący kodeks etyczny: ICF Code of Ethics (2020)

Kodeks ICF 2020 nie zawiera bezpośredniego zakazu używania AI, ale nakłada następujące obowiązki istotne dla narzędzi AI:

#### Sekcja 1 — Odpowiedzialność za klientów

**Standard 4 — Prowadzenie konwersacji coachingowej:**
> "Przed lub podczas pierwszej sesji coachingowej coach wyjaśnia i zapewnia, że klient i sponsor rozumieją charakter i potencjalne wartości coachingu, charakter i granice poufności..."

**Implikacja dla AI:** Coach musi poinformować klienta o użyciu narzędzi AI do przetwarzania notatek z sesji. Brak poinformowania = naruszenie obowiązku informacyjnego ICF.

**Standard 6 — Poufność i prywatność:**
> "Coach przestrzega wszystkich praw o ochronie prywatności i poufności wszelkich informacji dotyczących klientów..."

**Implikacja dla AI:** Przesyłanie notatek do zewnętrznego API AI (OpenAI) bez wiedzy i zgody klienta = potencjalne naruszenie poufności. ICF nie zakazuje użycia AI, ale wymaga, by coach poinformował klienta i uzyskał jego akceptację.

**Standard 9 — Integralność:**
> "Coach jest uczciwy i unika mylących przekonań lub twierdzeń dotyczących tego, co klient otrzyma od procesu coachingowego."

**Implikacja:** Jeśli coach używa AI do generowania retrospektyw lub rekomendacji, klient powinien wiedzieć, że doradztwo może być wspomagane AI.

#### Sekcja 3 — Kwestie technologii (FAQ ICF 2022)

ICF opublikowało w 2022 roku "Companion Guide" do kwestii technologicznych, w którym stwierdza:

> "ICF nie zakazuje stosowania narzędzi technologicznych, w tym AI, w coachingu. Jednakże coach zachowuje pełną odpowiedzialność za relację coachingową i musi zapewnić, że użycie technologii nie narusza zasad kodeksu etycznego."

**Kluczowe wnioski ICF:**
1. AI jest DOZWOLONE jako narzędzie wspierające coacha
2. Coach ponosi odpowiedzialność za wszelkie dane udostępniane narzędziom AI
3. Wymagana jest **przejrzystość** wobec klienta odnośnie użycia AI
4. Coach musi zapewnić, że AI nie podejmuje decyzji coachingowych za coacha

---

## 2. EMCC — European Mentoring and Coaching Council

### Obowiązujący kodeks etyczny: EMCC Global Code of Ethics (2021)

#### Artykuł 2 — Kompetencja

> "Praktykujący będzie korzystać z narzędzi, technik i metodologii adekwatnie do wymagań relacji i nie będzie stosować żadnych podejść, dla których nie posiada odpowiednich szkoleń lub doświadczenia."

**Implikacja AI:** Coach używający AI do analizy sesji powinien rozumieć, jak AI działa, jakie ma ograniczenia, i umieć ocenić jakość generowanych treści. "Ślepe" zaufanie AI = potencjalne naruszenie kompetencji.

#### Artykuł 3 — Kontekst

> "Praktykujący musi wypełniać wszelkie obowiązki prawne, w tym dotyczące prywatności i ochrony danych."

**Implikacja:** Bezpośrednie odniesienie do RODO — coach musi spełniać wymogi RODO przy użyciu AI.

#### Artykuł 4 — Granice

> "Praktykujący jasno określa i dotrzymuje granic relacji... i chroni poufność klienta."

**Implikacja AI:** Wysyłanie danych do AI = potencjalne naruszenie granic poufności bez wiedzy klienta.

#### Artykuł 8 — Zarządzanie relacją

> "Praktykujący zapewnia, że klient ma dostęp do informacji potrzebnych do podjęcia świadomej decyzji o zaangażowaniu się w relację."

**Implikacja:** Obowiązek poinformowania o użyciu AI jest elementem "informed consent" klienta.

#### EMCC AI Guidance (2023)

EMCC opublikowało w 2023 roku "AI and Technology Guidance for Coaches and Mentors":

> "Przed użyciem narzędzi AI coach powinien:
> 1. Poinformować klienta o użyciu AI i wyjaśnić, jak przetwarzane są dane
> 2. Uzyskać świadomą zgodę klienta
> 3. Zapewnić, że klient może odmówić bez negatywnych konsekwencji
> 4. Zrozumieć ograniczenia AI i nie traktować wyników jako ostatecznych
> 5. Chronić prywatność klienta przy konfiguracji narzędzi AI"

---

## 3. Porównanie ICF vs EMCC — wymagania AI

| Kwestia | ICF (2020+FAQ2022) | EMCC (2021+Guidance2023) |
|---------|-------------------|--------------------------|
| Zakaz używania AI | ❌ Nie | ❌ Nie |
| Obowiązek poinformowania klienta o AI | ✅ Tak (poufność, transparentność) | ✅ Tak (explicit) |
| Wymagana zgoda klienta na AI | ✅ Implicite (poufność) | ✅ Explicite ("świadoma zgoda") |
| Prawo odmowy klienta | Domyślnie tak | ✅ Explicite |
| Odpowiedzialność coacha za AI | ✅ Pełna | ✅ Pełna |
| Coach musi rozumieć AI | Nie explicite | ✅ Kompetencja |
| Zakaz decyzji przez AI | ✅ Implicite | ✅ Implicite |

---

## 4. Konsekwencje dla Session Lab

### 4.1 Co Session Lab musi zapewnić coachom

Aby coach mógł zgodnie z ICF i EMCC używać Session Lab z funkcjami AI, Session Lab musi dostarczyć:

1. **Wzorzec zgody klienta coacha na AI** (deliverable 10) — gotowy dokument, który coach daje klientowi przed pierwszą sesją
2. **Klauzulę informacyjną** (deliverable 8) — wyjaśnienie dla klientów coachów, jak Session Lab przetwarza dane
3. **Możliwość pracy bez AI** — coach powinien móc pracować z Session Lab bez wysyłania danych do OpenAI (wersja bez AI lub opcja opt-out)
4. **Transparentność Session Lab** — w UI wyraźna informacja o tym, które funkcje wysyłają dane do OpenAI

### 4.2 Rekomendacje dla UI/UX (dla CTO)

```
Przy każdej akcji wysyłającej dane do OpenAI (retrospektywa, mentor AI,
generowanie notatki offboardingowej, przetwarzanie transkrypcji):
→ Ikona lub badge "AI"
→ Tooltip wyjaśniający: "Ta funkcja przetwarza dane za pomocą OpenAI GPT-4o"
→ Możliwość pominięcia/rezygnacji z AI
```

### 4.3 Wymogi transparentności wobec klientów coachów

W klauzuli informacyjnej (deliverable 8) i zgodzie (deliverable 10) musi się znaleźć:
- Nazwa narzędzia AI (OpenAI GPT-4o)
- Cel przetwarzania przez AI
- Sposób zabezpieczenia danych (pseudonimizacja jeśli wdrożona)
- Prawo do odmowy bez konsekwencji
- Wpływ odmowy na dostępność usług coacha

---

## 5. Certyfikacja coachów — wpływ na akredytację

**Kluczowe pytanie:** Czy naruszenie wymogów AI kodeksów ICF/EMCC może skutkować cofnięciem certyfikacji?

**Odpowiedź:** Tak, potencjalnie. ICF i EMCC prowadzą postępowania dyscyplinarne za naruszenia kodeksu etycznego. Dokumentowane naruszenie poufności (dane klientów bez zgody w zewnętrznym AI) może:
- Skutkować upomnieniem
- Wymagać dodatkowego szkolenia
- W powtarzających się przypadkach: cofnięciem certyfikacji

**Dla Session Lab:** Dostarczenie gotowych wzorców zgody i klauzul informacyjnych chroni zarówno coachów (przed zarzutami naruszenia etyki) jak i Session Lab (przed roszczeniami ze strony coachów).

---

## 6. Działania Session Lab (priorytety)

| Priorytet | Działanie | Termin |
|-----------|-----------|--------|
| KRYTYCZNE | Wdrożyć wzorzec zgody coachee na AI | Przed launchem |
| KRYTYCZNE | Wdrożyć klauzulę informacyjną dla coachees | Przed launchem |
| WYSOKIE | Dodać oznaczenia AI w UI przy funkcjach AI | Sprint 1 |
| WYSOKIE | Opcja opt-out z AI dla coacha | Sprint 1-2 |
| ŚREDNIE | Zaktualizować Regulamin o wymogi ICF/EMCC | Przed launchem |
| NISKIE | FAQ dla coachów o zgodności z ICF/EMCC | Po launchу |

---

*Dokument przygotowany przez: Head of Legal, Session Lab*
*Wersja: 1.0 — 2026-03-30*
