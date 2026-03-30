# Umowa Powierzenia Przetwarzania Danych Osobowych (DPA)

**Załącznik nr 1 do Regulaminu Session Lab**
**Wersja:** 1.0
**Data:** 2026-03-30

*Niniejsza Umowa zawierana jest automatycznie w momencie akceptacji Regulaminu Session Lab.*

---

## Strony Umowy

**Administrator danych (Coach):**
[Imię i nazwisko / Nazwa firmy coacha]
[Adres]
[Email]
(dalej: „Administrator")

**Podmiot przetwarzający (Session Lab):**
Kamil Osiecki Digi M
z siedzibą w ul. Gąsiorowskiego 30, 05-520 Konstancin-Jeziorna
NIP: 1231399959
(dalej: „Podmiot przetwarzający" lub „Session Lab")

---

## §1 Przedmiot i cel powierzenia

1. Administrator powierza Podmiotowi przetwarzającemu przetwarzanie danych osobowych Klientów Administratora (Coachees) w zakresie niezbędnym do świadczenia usług Platformy Session Lab.

2. Przetwarzanie odbywa się wyłącznie w celu:
   a) przechowywania i zarządzania dokumentacją procesów coachingowych,
   b) udostępniania funkcjonalności Platformy Administratorowi,
   c) generowania raportów, retrospektyw i notatek za pomocą Funkcji AI na żądanie Administratora,
   d) realizacji obowiązków prawnych Podmiotu przetwarzającego.

3. Podmiot przetwarzający nie przetwarza danych w żadnym innym celu niż wskazanym powyżej.

---

## §2 Zakres powierzonych danych

### 2.1 Kategorie osób, których dane dotyczą
Klienci Administratora (Coachees) — osoby fizyczne objęte procesem coachingowym.

### 2.2 Kategorie danych osobowych

| Kategoria | Zakres |
|-----------|--------|
| Dane identyfikacyjne | Imię, nazwisko (lub pseudonim), rola, firma |
| Dane kontekstowe | Notatki ogólne o Coachee, etap procesu |
| Dane z sesji | Notatki z sesji (notesMd, planMd, scratchpadMd, summaryMd), transkrypcje |
| Dane offboardingowe | Szczegółowe dane z sesji offboardingowej |
| Dane retrospektyw | Raporty podsumowujące proces coachingowy |
| Dane konwersacji z Mentorem AI | Treść konwersacji z asystentem AI dotyczących Coachee |
| Dane szczególnej kategorii (art. 9 RODO) | Mogą wystąpić w notatkach — wyłącznie za wyraźną zgodą Coachee, za którą odpowiada Administrator |

### 2.3 Operacje przetwarzania
Zbieranie, rejestrowanie, organizowanie, strukturyzowanie, przechowywanie, adaptowanie, odczytywanie, przeglądanie, ujawnianie przez przesyłanie (do systemów AI), usuwanie — zgodnie z instrukcją Administratora.

---

## §3 Obowiązki Podmiotu przetwarzającego

Podmiot przetwarzający zobowiązuje się do:

1. **Przetwarzania danych wyłącznie na udokumentowane polecenie** Administratora — za polecenie uznaje się korzystanie przez Administratora z funkcji Platformy, w tym Funkcji AI.

2. **Zachowania poufności** — zapewnienia, że osoby upoważnione do przetwarzania danych zobowiązały się do poufności lub podlegają odpowiedniemu ustawowemu obowiązkowi poufności.

3. **Wdrożenia środków bezpieczeństwa** zgodnie z art. 32 RODO (patrz §5).

4. **Angażowania dalszych podmiotów przetwarzających** (podprocesorów) wyłącznie zgodnie z §4 niniejszej Umowy.

5. **Pomocy Administratorowi** w realizacji praw podmiotów danych (art. 15–22 RODO), z uwzględnieniem charakteru przetwarzania, w szczególności poprzez stosowne środki techniczne i organizacyjne.

6. **Pomocy Administratorowi** w wywiązaniu się z obowiązków art. 32–36 RODO (bezpieczeństwo, DPIA, naruszenia).

7. **Po zakończeniu Umowy** — usunięcia lub zwrotu wszelkich danych osobowych na żądanie Administratora w terminie 30 dni, oraz usunięcia istniejących kopii danych (z wyjątkiem przypadków, gdy prawo UE lub prawo polskie nakazuje przechowywanie).

8. **Udostępniania wszelkich informacji** niezbędnych do wykazania spełnienia obowiązków z niniejszej Umowy oraz umożliwienia i przyczyniania się do audytów i inspekcji przeprowadzanych przez Administratora lub upoważnionego przez niego audytora (z zachowaniem 14-dniowego wyprzedzenia i w rozsądnym zakresie).

---

## §4 Dalsze powierzenie (podprocesory)

1. Administrator niniejszym **wyraża ogólną zgodę** na angażowanie dalszych podmiotów przetwarzających (podprocesorów) wskazanych w Załączniku 1 do DPA.

2. Session Lab poinformuje Administratora o planowanym **dodaniu lub zastąpieniu** podprocesora z wyprzedzeniem co najmniej **14 dni** poprzez aktualizację listy podprocesorów na stronie Platformy i powiadomienie emailowe. Administrator ma prawo zgłosić sprzeciw wobec zmian w ciągu 14 dni od powiadomienia.

3. Podprocesory angażowani są na warunkach co najmniej równoważnych niniejszej Umowie.

4. Session Lab pozostaje odpowiedzialny za działania podprocesorów jak za własne działania.

### Aktualna lista podprocesorów (Załącznik 1 do DPA):

| Podprocesor | Cel | Siedziba | Zabezpieczenie |
|-------------|-----|----------|----------------|
| Supabase Inc. | Baza danych (PostgreSQL) | USA / dane w EU (Frankfurt) | SCCs + DPA |
| Vercel Inc. | Hosting aplikacji | USA / dane w EU | SCCs + DPA |
| OpenAI Inc. | Przetwarzanie AI (Funkcje AI) | USA | SCCs + DPA |
| Sentry Inc. | Monitoring błędów | USA | SCCs + DPA |

---

## §5 Środki techniczne i organizacyjne bezpieczeństwa

Podmiot przetwarzający wdraża i utrzymuje następujące środki bezpieczeństwa:

**Techniczne:**
- Szyfrowanie danych w tranzycie (TLS 1.3)
- Szyfrowanie danych w spoczynku (AES-256)
- Pseudonimizacja danych wysyłanych do systemów AI [po implementacji]
- Mechanizmy uwierzytelnienia (bcrypt hashowanie haseł)
- Kontrola dostępu oparta na rolach
- Regularne kopie zapasowe (Supabase Pro)

**Organizacyjne:**
- Polityka bezpieczeństwa informacji
- Upoważnienia do przetwarzania dla pracowników
- Zobowiązania do poufności
- Szkolenia z ochrony danych

---

## §6 Naruszenia ochrony danych

1. Podmiot przetwarzający powiadomi Administratora o każdym podejrzanym lub stwierdzonym naruszeniu ochrony danych osobowych **bez zbędnej zwłoki, jednak nie później niż w ciągu 36 godzin** od stwierdzenia naruszenia.

2. Powiadomienie będzie zawierać co najmniej:
   - opis charakteru naruszenia,
   - kategorię i przybliżoną liczbę osób i rekordów,
   - dane kontaktowe,
   - opis prawdopodobnych konsekwencji,
   - opis podjętych i planowanych działań zaradczych.

3. Administrator jest odpowiedzialny za ewentualne zgłoszenie naruszenia do UODO (art. 33 RODO) i powiadomienie Coachees (art. 34 RODO).

---

## §7 Prawa i obowiązki Administratora

1. Administrator jest odpowiedzialny za:
   a) legalność przetwarzania danych Coachees, w tym posiadanie ważnej podstawy prawnej,
   b) uzyskanie wymaganych zgód Coachees, w tym na przetwarzanie przez Session Lab i Funkcje AI,
   c) przekazanie Coachees wymaganych informacji (klauzula informacyjna),
   d) odpowiadanie na żądania Coachees dotyczące ich praw.

2. Administrator zobowiązuje się do:
   a) wprowadzania do Platformy wyłącznie danych, do których posiada ważną podstawę prawną przetwarzania,
   b) nieprzetwarzania danych szczególnej kategorii (art. 9) bez wyraźnej zgody Coachee,
   c) niezwłocznego powiadamiania Session Lab o zmianie zakresu upoważnienia do przetwarzania.

---

## §8 Czas trwania i rozwiązanie

1. Niniejsza Umowa obowiązuje przez czas trwania Regulaminu Session Lab (konta Coacha).

2. Z chwilą rozwiązania Umowy Session Lab usunie lub zwróci dane zgodnie z §3 pkt 7.

---

## §9 Odpowiedzialność

1. Podmiot przetwarzający ponosi odpowiedzialność wobec Administratora za szkody spowodowane naruszeniem niniejszej Umowy.

2. Całkowita odpowiedzialność Podmiotu przetwarzającego z tytułu niniejszej Umowy ograniczona jest do kwoty opłat uiszczonych przez Administratora w ciągu 12 miesięcy poprzedzających zdarzenie.

---

## §10 Prawo właściwe

Niniejsza Umowa podlega prawu polskiemu. Wszelkie spory rozstrzygane będą przez sąd właściwy dla siedziby Podmiotu przetwarzającego.

---

*DPA przygotowane przez: Head of Legal, Session Lab*
*Wersja: 1.0 — 2026-03-30*
*Status: WERSJA ROBOCZA — wymaga weryfikacji prawnika przed wdrożeniem*
