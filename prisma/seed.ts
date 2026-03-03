import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateOffboardingNote } from "../src/lib/offboardingNote";

const prisma = new PrismaClient();

async function main() {
  // ── Admin user bootstrap ─────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@coach.app";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const adminName = process.env.ADMIN_NAME ?? "Administrator";

  const adminHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", isBlocked: false },
    create: {
      email: adminEmail,
      password: adminHash,
      name: adminName,
      role: "ADMIN",
      isBlocked: false,
    },
  });
  console.log(`✔ Admin user: ${adminEmail}`);

  // ── Bezpieczne odświeżenie wbudowanych narzędzi (nie rusza danych użytkownika) ──
  await prisma.knowledgeTool.deleteMany({ where: { userId: null } });

  // ── Wbudowane narzędzia i techniki coachingowe ───────────────────────────
  await prisma.knowledgeTool.createMany({
    data: [
      {
        userId: null,
        name: "Model GROW",
        category: "Model",
        tags: "cel,diagnoza,zmiana",
        description: `Model GROW to jeden z najbardziej popularnych i szeroko stosowanych modeli struktury sesji coachingowej. Stworzony przez Sir Johna Whitmore'a w latach 80. XX wieku, stanowi fundament pracy wielu coachów ICF i EMCC na całym świecie.

GROW to akronim od: **Goal** (Cel), **Reality** (Rzeczywistość), **Options** (Opcje), **Will/Way Forward** (Wola działania). Model prowadzi klienta od zdefiniowania celu, przez ocenę aktualnej sytuacji, generowanie możliwości, aż do podjęcia konkretnych zobowiązań.

Siłą modelu jest jego prostota i elastyczność – można go stosować zarówno w krótkich sesjach 30-minutowych, jak i w długich procesach strategicznych. Sprawdza się szczególnie dobrze przy konkretnych celach zawodowych, planowaniu zmian i rozwiązywaniu problemów.`,
        structure: `## Cztery etapy GROW

### G – Goal (Cel)
Ustalenie jasnego, mierzalnego celu sesji oraz celu długoterminowego.
- "Czego chcesz osiągnąć na tej sesji?"
- "Jak brzmi Twój cel w perspektywie 3 miesięcy?"
- "Po czym poznasz, że osiągnąłeś/-aś sukces?"

### R – Reality (Rzeczywistość)
Eksploracja aktualnej sytuacji bez oceniania i doradzania.
- "Gdzie jesteś teraz w stosunku do tego celu?"
- "Co już próbowałeś/-aś?"
- "Co się dzieje, gdy próbujesz podjąć działanie?"

### O – Options (Opcje)
Generowanie możliwości i alternatyw – im więcej, tym lepiej.
- "Jakie masz możliwości?"
- "Co jeszcze mógłbyś/-aś zrobić?"
- "Gdybyś nie miał/-a żadnych ograniczeń, co byś wybrał/-a?"

### W – Will/Way Forward (Wola działania)
Przekształcenie opcji w konkretne zobowiązania i plan.
- "Które z tych opcji wybierasz?"
- "Co zrobisz i kiedy dokładnie?"
- "Na ile (1-10) jesteś zdecydowany/-a to zrealizować?"`,
        example: `**Sytuacja:** Klient chce awansować na stanowisko menedżera.

**Coach:** Czego chcesz osiągnąć na dzisiejszej sesji?
**Klient:** Chcę wymyślić, jak przekonać szefa do mojego awansu.

**Coach:** A gdybyś spojrzał szerzej – jaki jest Twój cel związany z karierą w perspektywie roku?
**Klient:** Chcę być menedżerem działu do końca roku.

**Coach:** Gdzie jesteś teraz na drodze do tego celu – w skali 1 do 10?
**Klient:** Może 4. Mam wyniki, ale nigdy nie rozmawiałem z szefem wprost o awansie.

**Coach:** Co już zrobiłeś w tym kierunku?
**Klient:** Wziąłem więcej projektów, ale nikt tego jakoś nie zauważył.

**Coach:** Jakie masz możliwości, żeby zmienić tę sytuację?
**Klient:** Mogę poprosić o rozmowę rozwojową, pokazać moje wyniki... albo poszukać mentora.

**Coach:** Które z tych opcji chcesz podjąć jako pierwszy krok?
**Klient:** Umówię rozmowę z szefem w tym tygodniu.`,
      },
      {
        userId: null,
        name: "Model OSKAR",
        category: "Model",
        tags: "cel,diagnoza,refleksja",
        description: `Model OSKAR (Outcome, Scaling, Know-how, Affirm & Action, Review) to framework coachingowy stworzony przez Marka McKergow i Paula Z. Jacksona jako alternatywa dla GROW. Jest zakorzeniony w podejściu skoncentrowanym na rozwiązaniach (Solution-Focused).

Model wyróżnia się naciskiem na zasoby klienta i to, co już działa. Zamiast analizować problemy, OSKAR kieruje uwagę na pożądane rezultaty i małe kroki do przodu. Szczególnie skuteczny w pracy z klientami, którzy utknęli w analizie problemów lub mają tendencję do nadmiernego skupiania się na przeszkodach.

Sprawdza się doskonale w coachingu biznesowym, coachingu zarządczym i sytuacjach, gdy klient potrzebuje szybkiego impulsu do działania.`,
        structure: `## Pięć etapów OSKAR

### O – Outcome (Wynik)
Zdefiniowanie pożądanego rezultatu w pozytywnych słowach.
- "Czego chcesz zamiast obecnej sytuacji?"
- "Jak będzie wyglądało Twoje życie/praca, gdy osiągniesz cel?"
- "Co będziesz robił/-a inaczej?"

### S – Scaling (Skalowanie)
Ocena aktualnego postępu i zasobów na skali 1-10.
- "Gdzie jesteś teraz na skali 1-10, gdzie 10 to osiągnięty cel?"
- "Co sprawia, że jesteś na [X], a nie na 1?"
- "Co musiałoby się stać, żebyś był/-a o 1 punkt wyżej?"

### K – Know-how (Wiedza i zasoby)
Identyfikacja istniejących zasobów, kompetencji i dotychczasowych sukcesów.
- "Co już wiesz o osiąganiu podobnych celów?"
- "Kiedy podobna sytuacja poszła lepiej – co robiłeś/-aś inaczej?"
- "Jakie mocne strony możesz wykorzystać?"

### A – Affirm & Action (Potwierdzenie i działanie)
Docenienie postępu i zaplanowanie następnych kroków.
- "Co działa dobrze i warto kontynuować?"
- "Jaki jest jeden mały krok, który możesz zrobić teraz?"

### R – Review (Przegląd)
Ocena postępów i refleksja na początku kolejnej sesji.
- "Co zrobiłeś/-aś od ostatniej sesji?"
- "Co się sprawdziło? Co możesz teraz zrobić więcej?"`,
        example: `**Sytuacja:** Klientka ma trudności z delegowaniem zadań zespołowi.

**Coach:** Wyobraź sobie, że delegowanie idzie Ci świetnie. Jak wygląda Twój tydzień?
**Klientka:** Mam czas na strategię, nie wchodzę w każdy szczegół, ufam ludziom.

**Coach:** Na skali 1-10, gdzie jesteś teraz z delegowaniem?
**Klientka:** Może 3. Kontroluję prawie wszystko.

**Coach:** Co sprawia, że jesteś na 3, a nie na 1?
**Klientka:** Kilka rzeczy zlecam asystentce i to działa.

**Coach:** Co wiesz o sobie, co pomogło Ci w tamtych przypadkach?
**Klientka:** Chyba to, że dokładnie opisałam, czego oczekuję.

**Coach:** Co możesz zrobić w tym tygodniu, żeby być o pół punktu wyżej?
**Klientka:** Zdeleguję jeden raport tygodniowy i napiszę do tego brief.`,
      },
      {
        userId: null,
        name: "Koło życia",
        category: "Narzędzie",
        tags: "diagnoza,zmiana,motywacja",
        description: `Koło życia (Wheel of Life) to jedno z najbardziej rozpoznawalnych narzędzi coachingowych, służące do wizualizacji i oceny aktualnego poziomu satysfakcji w kluczowych obszarach życia. Narzędzie pochodzi z tradycji coachingowej lat 80. XX wieku i jest powszechnie stosowane przez coachów ICF.

Narzędzie polega na ocenie wybranych 6-10 obszarów życia (np. kariera, zdrowie, relacje, finanse, rozwój osobisty) na skali 1-10. Wyniki naniesione na koło pokazują graficznie "nierówności" – obszary, które wymagają uwagi. Metafora koła jest celowa: nierówne koło "toczy się" niekomfortowo.

Koło życia jest szczególnie wartościowe na początku procesu coachingowego jako narzędzie diagnozy i ustalania priorytetów. Może być stosowane jako punkt wyjścia do rozmowy lub jako narzędzie przeglądowe po kilku miesiącach pracy.`,
        structure: `## Jak przeprowadzić ćwiczenie Koła życia

### Krok 1: Wybór obszarów
Standardowe obszary (możesz dostosować z klientem):
- Kariera i praca zawodowa
- Finanse i materialne warunki życia
- Zdrowie i energia fizyczna
- Relacje romantyczne/partnerstwo
- Rodzina i przyjaciele
- Rozwój osobisty i edukacja
- Zabawa, rekreacja i odpoczynek
- Środowisko (dom, otoczenie)

### Krok 2: Ocena
Klient ocenia każdy obszar w skali 1-10:
- 1 = bardzo niezadowolony/-a
- 10 = w pełni usatysfakcjonowany/-a
- Ważne: ocena to subiektywne odczucie, nie obiektywna analiza

### Krok 3: Wizualizacja
Wyniki nanosi się na koło (lub omawia bez rysowania).

### Krok 4: Refleksja i wybór priorytetu
- "Patrząc na to koło – co Cię uderza?"
- "Który obszar, gdybyś go podniósł/-a, najbardziej wpłynąłby na inne?"
- "Gdzie chcesz zacząć?"

### Krok 5: Ustalenie celu
Wybrany obszar staje się punktem wyjścia do pracy coachingowej.`,
        example: `**Sytuacja:** Klient na początku procesu coachingowego.

**Coach:** Oceniłeś "Zdrowie" na 3 i "Karierę" na 8. Co cię uderza, gdy patrzysz na te liczby?
**Klient:** Że całkowicie poświęciłem zdrowie dla kariery.

**Coach:** Co się dzieje z Twoim zdrowiem na poziomie 3?
**Klient:** Nie śpię, nie ćwiczę, żyję na kawie. Wiem, że to nie jest dobre.

**Coach:** Gdybyś podniósł zdrowie do 5 – jak by to wpłynęło na inne obszary?
**Klient:** Chyba miałbym więcej energii do pracy. I do rodziny.

**Coach:** Który z tych obszarów chciałbyś wziąć na warsztat na ten proces?
**Klient:** Zdrowie. Bez sensu gonić za karierą, jeśli nie mam siły.

**Coach:** Co byłby pierwszy sygnał, że jesteś na 4 ze zdrowiem?
**Klient:** Wychodzę z biura przed 19:00 przynajmniej 3 razy w tygodniu.`,
      },
      {
        userId: null,
        name: "Skalowanie",
        category: "Technika",
        tags: "diagnoza,motywacja,refleksja",
        description: `Technika skalowania (Scaling Questions) pochodzi z podejścia Solution-Focused Brief Therapy (SFBT), opracowanego przez Steve'a de Shazera i Insoo Kim Berg. W coachingu jest szeroko stosowana jako szybkie narzędzie oceny stanu, postępu i motywacji klienta.

Technika polega na prośbie o ocenę sytuacji na skali numerycznej (najczęściej 1-10), a następnie eksploracji tego, co oznacza konkretna liczba. Pytania skalujące są szczególnie skuteczne, bo: (1) konkretyzują abstrakcyjne odczucia, (2) pomagają dostrzec postęp nawet małe kroki, (3) otwierają rozmowę o zasobach klienta.

Można skalować niemal wszystko: gotowość do zmiany, poziom pewności siebie, jakość relacji, satysfakcję z pracy, poczucie sensu. Technika jest prosta i można ją zastosować w każdym momencie sesji.`,
        structure: `## Jak stosować pytania skalujące

### Podstawowe pytanie
"Na skali od 1 do 10, gdzie 1 to [najgorszy stan], a 10 to [idealny stan] – gdzie jesteś teraz?"

### Eksploracja aktualnej pozycji
- "Co sprawia, że jesteś na [X], a nie na 1?" → odkrywa zasoby
- "Co zrobiłeś/-aś, że udało Ci się dotrzeć do [X]?" → uznanie postępu

### Eksploracja małego kroku
- "Co musiałoby się stać, żebyś był/-a o 1 punkt wyżej?"
- "Co byłby najmniejszy możliwy krok?"
- "Co zrobiłbyś/-abyś inaczej, będąc o 1 wyżej?"

### Warianty skalowania
- **Skala gotowości:** "Na ile jesteś gotowy/-a to zrobić?"
- **Skala pewności:** "Na ile jesteś pewny/-a, że to zrealizujesz?"
- **Skala ważności:** "Na ile ten cel jest dla Ciebie ważny?"
- **Skala relacji:** "Na ile jesteś zadowolony/-a z tej relacji?"

### Wskazówki
- Nie interpretuj liczb – pytaj, co dla klienta oznaczają
- Skala 1-10 jest najczęstsza, ale możesz używać 0-10 lub 1-5
- Po skalowaniu zawsze pytaj "co z tego wynika dla Ciebie?"`,
        example: `**Sytuacja:** Klientka boi się prezentować publicznie.

**Coach:** Na skali 1-10, gdzie 1 to "nie wchodzę na scenę za nic", a 10 to "z przyjemnością prezentuję" – gdzie jesteś?
**Klientka:** Może 4. Daję radę, ale cały czas mam tremę.

**Coach:** Co sprawia, że jesteś na 4, a nie na 1?
**Klientka:** Dałam radę kilka razy. Wiem, że fizycznie jestem w stanie to zrobić.

**Coach:** Co zrobiłaś, że udało Ci się dotrzeć do czwórki?
**Klientka:** Ćwiczyłam przed lustrem. I raz poprosiłam koleżankę o feedback.

**Coach:** Co musiałoby się stać, żebyś była na 5?
**Klientka:** Chyba żebym wiedziała, że materiał jest naprawdę dobry. Mało ćwiczę.

**Coach:** Jaki jest jeden krok, który możesz zrobić przed następną prezentacją?
**Klientka:** Zrobię próbę na głos, nagrywając się na telefon.`,
      },
      {
        userId: null,
        name: "Clean Language",
        category: "Technika",
        tags: "przekonania,refleksja",
        description: `Clean Language to technika stworzona przez psychoterapeutę Davida Grove'a w latach 80. XX wieku, rozwinięta przez Penelope Tompkins i Jamesa Lawleya. Opiera się na idei, że każdy człowiek posługuje się unikalnymi metaforami i symbolami, które odzwierciedlają jego wewnętrzny model świata.

"Czysty" oznacza, że coach minimalizuje swój własny wpływ na myślenie klienta – używa wyłącznie słów klienta, nie narzuca interpretacji, nie proponuje metafor. Technika jest wyjątkowo szanująca autonomię klienta i pozwala mu odkryć własne głębsze rozumienie sytuacji.

Technika jest szczególnie skuteczna, gdy klient: używa żywych metafor ("czuję się jakbym tonął"), utknął w analizie racjonalnej, potrzebuje nowego wglądu lub pracuje z przekonaniami i wartościami. Wymaga od coacha dużej uważności i cierpliwości.`,
        structure: `## Podstawowe pytania Clean Language

### Pytania eksploracyjne
- "I co jest w tym [słowo klienta]?"
- "I jest jeszcze coś w tym [słowo klienta]?"
- "I gdzie jest to [słowo klienta]?"
- "I jak duże / małe jest to [słowo klienta]?"

### Pytania o lokalizację i cechy
- "I gdzie dokładnie jest [X]?"
- "I czy [X] jest w środku, czy na zewnątrz?"
- "I jaki kształt ma [X]?"

### Pytania o ruch i czas
- "I co się dzieje zaraz przed [X]?"
- "I co się dzieje po [X]?"
- "I skąd przychodzi [X]?"

### Pytania o relacje
- "I jaki jest związek między [X] a [Y]?"

### Zasady stosowania
- Powtarzaj słowa klienta dokładnie – nie parafrazuj
- Jeden temat na raz
- Pauzy są wartościowe – nie wypełniaj ciszy
- Nie zadawaj pytań "dlaczego"
- Poprzedzaj pytanie słowem "I" (spójnik "I" pochodzi z angielskiego oryginału)`,
        example: `**Sytuacja:** Klient mówi, że "czuje się uwięziony w swojej pracy".

**Coach:** I co to jest – być uwięzionym?
**Klient:** To jak klatka. Widzę świat przez kraty, ale nie mogę wyjść.

**Coach:** I gdzie jest ta klatka?
**Klient:** W klatce piersiowej. Tutaj [wskazuje na pierś].

**Coach:** I co jest w tej klatce?
**Klient:** Ja. I moje marzenia, które tam siedzą razem ze mną.

**Coach:** I jest jeszcze coś w tej klatce?
**Klient:** Klucz. Jest klucz, ale wisi po zewnętrznej stronie.

**Coach:** I co wiesz o tym kluczu?
**Klient:** Że może ktoś inny go trzyma. Że sam sobie nie dam rady...
*(Odkrycie: przekonanie o zależności od innych w kontekście zmiany kariery)*`,
      },
      {
        userId: null,
        name: "Pytania mocne",
        category: "Technika",
        tags: "refleksja,diagnoza",
        description: `Pytania mocne (Powerful Questions) to jedna z kluczowych kompetencji ICF – umiejętność zadawania pytań, które stymulują myślenie, odkrywanie i wgląd. W odróżnieniu od pytań informacyjnych (zbierających dane) lub naprowadzających (sugerujących odpowiedź), pytania mocne otwierają przestrzeń do nowego rozumienia.

Mocne pytanie charakteryzuje się tym, że: (1) jest otwarte – nie można odpowiedzieć "tak/nie", (2) pochodzi z ciekawości, nie z agendy coacha, (3) jest krótkie i proste, (4) może zmienić perspektywę klienta, (5) często zaczyna się od "Co", "Jak", "Czego", "Skąd".

Pytania mocne są fundamentem stylu niedyrektywnego – zamiast dawać rady, coach zadaje pytania, które pomagają klientowi znaleźć własne odpowiedzi. Jest to zgodne z założeniem ICF, że klient jest ekspertem od swojego życia.`,
        structure: `## Kategorie pytań mocnych

### Pytania o cel i sens
- "Czego naprawdę chcesz?"
- "Co jest dla Ciebie najważniejsze w tej sytuacji?"
- "Do czego tak naprawdę dążysz?"

### Pytania eksplorujące zasoby
- "Kiedy wcześniej podobna sytuacja się udała – co robiłeś/-aś?"
- "Co wiesz o sobie, co mogłoby tu pomóc?"
- "Kto w Twoim otoczeniu radzi sobie z tym dobrze?"

### Pytania zmieniające perspektywę
- "Co by się zmieniło, gdybyś spojrzał/-a na to inaczej?"
- "Jak by to wyglądało za 5 lat, gdybyś nic nie zmienił/-a?"
- "Co powiedziałby Twój mentor, patrząc na tę sytuację?"

### Pytania o przekonania
- "Co Ci mówi, że to niemożliwe?"
- "Skąd wiesz, że tak jest?"
- "Co by się stało, gdyby to przekonanie nie było prawdą?"

### Pytania o działanie
- "Co możesz zrobić już dziś?"
- "Jaki jest pierwszy, najłatwiejszy krok?"
- "Co Cię powstrzymuje – i co możesz z tym zrobić?"

### Czego unikać
- Pytań naprowadzających: "Czy nie uważasz, że powinieneś/-naś...?"
- Pytań wielokrotnych: nie zadawaj 2 pytań naraz
- Pytań "dlaczego": często wywołują defensywność`,
        example: `**Sytuacja:** Klient rozważa zmianę pracy, ale się boi.

**Coach:** Czego tak naprawdę chcesz z tej zmiany?
**Klient:** Chcę czuć, że moja praca ma sens. Teraz robię coś, co nikogo nie obchodzi.

**Coach:** Co Ci mówi, że to "nikogo nie obchodzi"?
**Klient:** No... właściwie nie wiem. Tak to czuję.

**Coach:** A kiedy czułeś, że Twoja praca ma sens – co wtedy robiłeś?
**Klient:** W poprzedniej firmie prowadziłem szkolenia. Ludzie mówili, że im to pomogło.

**Coach:** Co ta odpowiedź mówi Ci o tym, czego szukasz?
**Klient:** Że chcę bezpośredniego kontaktu z ludźmi i widzieć efekty.

**Coach:** Co by się stało, gdybyś zaprojektował swoją idealną pracę – bez ograniczeń?
**Klient:** Byłbym trenerem lub coachem. Tego zawsze chciałem.`,
      },
      {
        userId: null,
        name: "5 Dlaczego",
        category: "Narzędzie",
        tags: "przekonania,refleksja,diagnoza",
        description: `Technika "5 Dlaczego" (5 Whys) pochodzi pierwotnie z metodologii Lean/Toyota Production System, gdzie służy do analizy przyczyn problemów technicznych. W coachingu jest adaptowana do eksploracji głębszych motywacji, przekonań i wartości klienta.

W kontekście coachingowym technika polega na zadaniu pytania "Co za tym stoi?" lub "Dlaczego to jest dla Ciebie ważne?" kilkukrotnie (zazwyczaj 3-5 razy), aby dotrzeć do głębszych warstw motywacji. Każda kolejna odpowiedź otwiera nową, głębszą warstwę rozumienia.

Technika jest szczególnie skuteczna, gdy klient utknął w powierzchownym rozumowaniu, chce zrozumieć własne priorytety lub odkryć, co naprawdę go motywuje. Wymaga delikatności – "dlaczego" może brzmieć oskarżająco, dlatego warto stosować łagodniejsze sformułowania.`,
        structure: `## Jak stosować technikę w coachingu

### Zasady stosowania
- Używaj łagodniejszych form niż "dlaczego": "Co za tym stoi?", "Co to dla Ciebie oznacza?", "Skąd ten cel pochodzi?"
- Nie oceniaj odpowiedzi – przyjmuj każdą z ciekawością
- Zatrzymaj się, gdy klient dotarł do wartości lub głębokiego przekonania
- 3-5 pytań zazwyczaj wystarczy – nie musisz koniecznie osiągnąć "5"

### Sekwencja pytań
1. "Co chcesz osiągnąć?" → odpowiedź klienta
2. "Co sprawia, że to jest dla Ciebie ważne?" → głębsza warstwa
3. "A co to dla Ciebie oznacza?" → jeszcze głębiej
4. "Skąd pochodzi ta wartość?" → korzenie
5. "Gdybyś osiągnął/-a to wszystko – czym byłoby Twoje życie?" → esencja

### Sygnały zatrzymania
- Klient dotarł do wartości (bezpieczeństwo, wolność, miłość, sensu)
- Pojawiło się silne emocjonalne rezonowanie
- Klient mówi "po prostu to czuję" – często oznacza dotarcie do jądra`,
        example: `**Sytuacja:** Klient chce zarabiać więcej.

**Coach:** Co sprawia, że zarobki są dla Ciebie ważne?
**Klient:** Bo chcę mieć poczucie bezpieczeństwa finansowego.

**Coach:** Co dla Ciebie oznacza poczucie bezpieczeństwa finansowego?
**Klient:** Że nie będę musiał martwić się o jutro. Że rodzina będzie zadbana.

**Coach:** Co za tym stoi – za tym dbaniem o rodzinę?
**Klient:** Mój ojciec przez całe dzieciństwo nie miał pracy. Pamiętam ten stres w domu.

**Coach:** Co ta historia mówi Ci o tym, co naprawdę chcesz osiągnąć?
**Klient:** Chyba chcę dać swoim dzieciom to, czego mi brakowało. Spokój i stabilność.

**Coach:** Gdybyś miał/-a ten spokój i stabilność – czym byłoby wtedy Twoje życie?
**Klient:** Wolne. Mógłbym w końcu myśleć o sobie, a nie tylko o przetrwaniu.`,
      },
      {
        userId: null,
        name: "Linia czasu",
        category: "Narzędzie",
        tags: "zmiana,refleksja,cel",
        description: `Linia czasu (Timeline) to technika coachingowa i terapeutyczna, zaczerpnięta częściowo z NLP (Neuro-Linguistic Programming). W coachingu służy do pracy z perspektywą czasową klienta – pomagając mu świadomie patrzeć na przeszłość (zasoby, doświadczenia), teraźniejszość (aktualna sytuacja) i przyszłość (cele, wizja).

Technika może być stosowana werbalnie (pytaniami) lub wizualnie (klient rysuje linię lub fizycznie staje w różnych punktach przestrzeni). Fizyczna wersja jest szczególnie angażująca i pomaga klientom, którzy uczą się przez ruch lub mają trudność z abstrakcyjnym myśleniem.

Linia czasu jest przydatna: przy ustalaniu celów długoterminowych, odkrywaniu wzorców z przeszłości, budowaniu wizji przyszłości oraz pracy z przekonaniami opartymi na historii.`,
        structure: `## Warianty stosowania

### Wersja werbalna
**Pytania o przeszłość:**
- "Kiedy wcześniej w swoim życiu radziłeś/-aś sobie z podobnym wyzwaniem?"
- "Jakie zasoby wtedy miałeś/-aś?"

**Pytania o teraźniejszość:**
- "Gdzie jesteś teraz na tej drodze?"

**Pytania o przyszłość:**
- "Wyobraź sobie siebie za 5 lat – jak wygląda Twoje życie?"
- "Co chcesz, żeby ludzie mówili o Tobie na Twoim 70. urodzeniu?"
- "Patrząc wstecz z przyszłości – co jest dla Ciebie ważne?"

### Wersja wizualna
1. Poproś klienta, żeby narysował linię lub wskazał ją gestem
2. Zaznaczcie razem: przeszłość (zasoby), teraźniejszość (wyzwanie), przyszłość (cel)
3. Eksploruj każdy punkt pytaniami
4. Połączcie wnioski: "Co z przeszłości możesz zabrać do przyszłości?"

### Technika "List do siebie z przyszłości"
Wariant: klient wyobraża sobie siebie za 1-5 lat i pisze list do obecnego siebie z radami. Szczególnie skuteczne dla osób pracujących z decyzjami.`,
        example: `**Sytuacja:** Klientka waha się przed zmianą kariery.

**Coach:** Gdybyś wyobraziła sobie siebie za 5 lat – co widzisz?
**Klientka:** Chciałabym prowadzić własną firmę doradczą. Ale to wydaje się nierealne.

**Coach:** Patrząc wstecz z tej przyszłości, co zrobiłaś, żeby tam dotrzeć?
**Klientka:** Hmm... chyba zaczęłam od małych projektów. Brałam zlecenia na boku.

**Coach:** Kiedy w przeszłości zrobiłaś coś, co wtedy wydawało się niemożliwe?
**Klientka:** Przeprowadziłam się do nowego miasta i znalazłam pracę od zera. 8 lat temu.

**Coach:** Co wtedy Ci pomogło?
**Klientka:** Zdecydowałam i po prostu zaczęłam. Nie czekałam na idealny moment.

**Coach:** Co ta historia mówi Ci o tym, jak możesz podejść do teraźniejszej sytuacji?
**Klientka:** Że trzeba po prostu zacząć. Nie czekać, aż wszystko będzie pewne.`,
      },
      {
        userId: null,
        name: "Kontrakt coachingowy",
        category: "Narzędzie",
        tags: "cel,diagnoza",
        description: `Kontrakt coachingowy (Contracting) to kompetencja ICF i fundamentalne narzędzie każdej sesji coachingowej. Polega na ustaleniu z klientem, na co chce przeznaczyć czas sesji, jaki efekt chce osiągnąć i jak będzie wiedział, że sesja była udana.

Kontrakt funkcjonuje na dwóch poziomach: (1) **kontrakt procesu** – ustalenie zasad współpracy na cały proces coachingowy (liczba sesji, format, poufność, role) oraz (2) **kontrakt sesji** – ustalenie celu konkretnej sesji.

Brak kontraktu sesji jest jedną z najczęstszych słabości coachów – bez niego sesja może "dryfować" lub skupiać się na tym, co ciekawe, zamiast na tym, co ważne dla klienta. Dobry kontrakt sesji zawiera: temat, pożądany efekt i miarę sukcesu.`,
        structure: `## Elementy kontraktu sesji

### Trzy kluczowe pytania
1. **Temat:** "Na czym chcesz się skupić na tej sesji?"
2. **Efekt:** "Co chcesz osiągnąć lub co chcesz mieć po tej sesji?"
3. **Miara sukcesu:** "Po czym poznasz, że ta sesja była dla Ciebie wartościowa?"

### Pogłębienie kontraktu
- "Czy to jest najważniejsza rzecz, którą możemy dziś omówić?"
- "Ile czasu chcesz poświęcić na ten temat?"
- "Czy jest coś, czego nie chcesz dziś poruszać?"

### Kontrakt procesu (na cały coaching)
- Liczba sesji, częstotliwość, długość
- Format (online/offline, narzędzia)
- Poufność i jej wyjątki
- Role: coach nie jest doradcą ani terapeutą
- Prawa obu stron: do zakończenia współpracy, do informacji zwrotnej

### Renegocjacja w trakcie sesji
Jeśli temat sesji się zmienia:
- "Widzę, że rozmowa skierowała się w stronę X. Czy chcesz na tym się skupić, czy wracamy do pierwotnego tematu?"

### Zamknięcie sesji (mini-kontrakt zwrotny)
- "Czego się nauczyłeś/-aś na tej sesji?"
- "Co weźmiesz ze sobą?"
- "Jaki jest Twój następny krok?"`,
        example: `**Otwarcie sesji:**

**Coach:** Czym chcesz się dziś zająć?
**Klient:** Mam problem z jednym z pracowników – ciągle się spóźnia i nie wywiązuje z terminów.

**Coach:** Co chcesz osiągnąć rozmawiając o tym dziś?
**Klient:** Chcę wiedzieć, jak z nim porozmawiać – żeby to coś zmieniło.

**Coach:** Po czym poznasz, że ta sesja była dla Ciebie wartościowa?
**Klient:** Wyjdę stąd z konkretnym planem rozmowy.

**Coach:** Dobrze. Skupiamy się więc na tym, jak przygotować rozmowę z pracownikiem. Czy to jest dla Ciebie najbardziej istotne teraz?
**Klient:** Tak. To mnie najbardziej stresuje w tej chwili.

**Coach:** Świetnie. Zacznijmy. Opowiedz mi więcej o tej sytuacji.`,
      },
      {
        userId: null,
        name: "Feedback SBI",
        category: "Model",
        tags: "relacje,kariera,refleksja",
        description: `Model SBI (Situation-Behavior-Impact) to struktura udzielania informacji zwrotnej, opracowana przez Center for Creative Leadership (CCL). Jest szeroko stosowana w coachingu liderów i w coachingu kompetencji komunikacyjnych.

SBI wyróżnia trzy elementy feedbacku: **Sytuacja** (konkretny kontekst), **Zachowanie** (obserwowalne działanie, nie interpretacja) i **Wpływ** (efekt tego zachowania na nadawcę lub otoczenie). Model zapobiega uogólnieniom ("zawsze tak robisz"), ocenom ("jesteś nieodpowiedzialny/-a") i interpretacjom ("na pewno ci zależy").

W coachingu SBI jest przydatny zarówno jako narzędzie do nauczenia klienta dawania feedbacku, jak i jako struktura, z której korzysta sam coach udzielając klientowi informacji zwrotnej.`,
        structure: `## Trzy elementy SBI

### S – Sytuacja (Situation)
Konkretny kontekst, kiedy i gdzie miało miejsce zachowanie.
- NIE: "Zawsze spóźniasz się na spotkania"
- TAK: "Na wczorajszym spotkaniu projektowym o 10:00..."

### B – Zachowanie (Behavior)
Obserwowalne, konkretne działanie – nie interpretacja ani ocena.
- NIE: "Byłeś/-aś nieprzygotowany/-a i nieodpowiedzialny/-a"
- TAK: "...przyszedłeś/-aś 15 minut po czasie i nie miałeś/-aś materiałów"

### I – Wpływ (Impact)
Efekt tego zachowania na Ciebie, zespół lub projekt.
- NIE: "Przez Ciebie wszystko się posypało"
- TAK: "...w związku z tym musieliśmy czekać i straciliśmy czas zaplanowany na kluczową decyzję"

## Rozszerzenie: SBI+I (Intent)
Opcjonalne pytanie o intencję: "Chcę zrozumieć – co Cię skłoniło do takiego zachowania?"

## Jak uczyć klienta feedbacku SBI
1. Wyjaśnij model
2. Poproś klienta, żeby sformułował feedback wg SBI
3. Omów, co zmienia takie podejście
4. Przeprowadź ćwiczenie odgrywania ról (jeśli potrzeba)`,
        example: `**Sytuacja:** Klient chce nauczyć się dawać feedback pracownicy.

**Coach:** Jak planujesz porozmawiać z Marią o tej sytuacji?
**Klient:** Powiem jej, że jest nieodpowiedzialna i że jej zachowanie niszczy atmosferę.

**Coach:** Co się stanie, gdy to powiesz?
**Klient:** Pewnie się obrazi i powie, że to nie jej wina.

**Coach:** Co gdybyś opisał konkretną sytuację, zachowanie i jego wpływ – zamiast oceny?
**Klient:** Czyli jak?

**Coach:** Powiedz mi o konkretnym zdarzeniu.
**Klient:** Wczoraj na prezentacji dla klienta nie miała gotowych slajdów i musieliśmy improwizować.

**Coach:** A jak to wpłynęło na Ciebie i sytuację?
**Klient:** Byłem zestresowany, klient to zauważył, straciliśmy wiarygodność.

**Coach:** Spróbuj teraz powiedzieć to w formie SBI.
**Klient:** "Mario, wczoraj na prezentacji dla klienta o 14:00 slajdy nie były gotowe. W efekcie musieliśmy improwizować i klient wydawał się zdezorientowany. To mnie mocno stresuje i obawiam się o nasz wizerunek."`,
      },
      {
        userId: null,
        name: "Model WOOP",
        category: "Model",
        tags: "cel,motywacja,zmiana",
        description: `Model WOOP (Wish, Outcome, Obstacle, Plan) to oparta na badaniach naukowych technika wyznaczania i osiągania celów, opracowana przez profesor Gabriele Oettingen z NYU. Łączy pozytywne myślenie o celu (Życzenie i Wynik) z realistycznym podejściem do przeszkód (Przeszkoda i Plan).

Badania Oettingen pokazały, że samo pozytywne wizualizowanie sukcesu zmniejsza motywację do działania. WOOP rozwiązuje ten problem, dodając etap identyfikacji przeszkód i planu radzenia sobie z nimi. Model jest szczególnie przydatny, gdy klient ma jasny cel, ale nie potrafi go zrealizować mimo starań.

Technika "Jeśli X, to Y" w etapie planu pochodzi z teorii implementacji zamiarów i znacząco zwiększa prawdopodobieństwo realizacji celu.`,
        structure: `## Cztery kroki WOOP

### W – Wish (Życzenie)
Zdefiniowanie ważnego i realistycznego życzenia/celu.
- "Jakie jest Twoje życzenie lub cel na najbliższe [czas]?"
- Ważne: ma być ambitne, ale możliwe do osiągnięcia

### O – Outcome (Wynik)
Wyobrażenie najlepszego możliwego rezultatu osiągnięcia celu.
- "Wyobraź sobie, że osiągnąłeś/-aś ten cel. Co widzisz? Co czujesz?"
- Klient zamyka oczy i wizualizuje przez chwilę

### O – Obstacle (Przeszkoda)
Identyfikacja głównej wewnętrznej przeszkody.
- "Co jest główną wewnętrzną przeszkodą? Co w Tobie może Cię powstrzymać?"
- Ważne: chodzi o wewnętrzne przeszkody (nawyki, emocje, przekonania), nie zewnętrzne

### P – Plan (Plan)
Sformułowanie planu "Jeśli X, to Y".
- "Jeśli pojawi się [przeszkoda], to zrobię [konkretne działanie]"
- Konkretny plan działania w odpowiedzi na przeszkodę`,
        example: `**Sytuacja:** Klient chce ćwiczyć regularnie, ale ciągle rezygnuje.

**Coach:** Jakie jest Twoje życzenie związane ze zdrowiem?
**Klient:** Chcę ćwiczyć 3 razy w tygodniu przez następne 2 miesiące.

**Coach:** Wyobraź sobie, że Ci się to udaje. Co widzisz? Co czujesz?
**Klient:** Mam więcej energii, lepiej sypiam. Czuję się silniejszy.

**Coach:** Co jest główną przeszkodą wewnętrzną – co w Tobie może Cię powstrzymać?
**Klient:** Moje myślenie "jestem za zmęczony po pracy". To jest mój główny wróg.

**Coach:** Kiedy pojawia się ta myśl?
**Klient:** Zwykle ok. 18:00, gdy wracam do domu i opadam na kanapę.

**Coach:** Jak możesz zaplanować swoje działanie w odpowiedzi na tę myśl?
**Klient:** Jeśli poczuję "jestem za zmęczony", to od razu wychodzę na 20-minutowy spacer – nie siłownia, tylko spacer. To mogę zawsze.`,
      },
      {
        userId: null,
        name: "Pozycje percepcji",
        category: "Technika",
        tags: "relacje,refleksja,decyzja",
        description: `Pozycje percepcji to technika wywodząca się z NLP (Neuro-Linguistic Programming), opisana przez Roberta Diltsa. Polega na świadomym przyjmowaniu różnych punktów widzenia: własnego (I pozycja), drugiej osoby (II pozycja) i obserwatora zewnętrznego (III pozycja).

Technika jest szczególnie skuteczna w pracy z: konfliktami i trudnymi relacjami, sytuacjami wymagającymi empatii, przygotowaniem do trudnych rozmów, analizą sytuacji, w której klient utknął w jednej perspektywie.

W coachingu pozycje percepcji pomagają klientom wyjść ze swojej własnej perspektywy i zrozumieć sytuację z różnych punktów widzenia. Często prowadzi to do odkrycia nowych możliwości i rozwiązań, które były niewidoczne z jednej perspektywy.`,
        structure: `## Trzy pozycje percepcji

### I Pozycja – Własna perspektywa
Klient jest całkowicie sobą, patrzy na sytuację ze swojego punktu widzenia.
- "Jak Ty widzisz tę sytuację?"
- "Co Ty czujesz, myślisz, chcesz?"
- "Jakie są Twoje potrzeby?"

### II Pozycja – Perspektywa drugiej osoby
Klient "wchodzi w skórę" drugiej osoby i patrzy ze jej punktu widzenia.
- "Gdybyś był/-a [tą osobą], jak byś widział/-a tę sytuację?"
- "Co [ta osoba] czuje? Czego potrzebuje?"
- "Patrząc na [siebie] z perspektywy [tej osoby] – co widzisz?"

### III Pozycja – Perspektywa zewnętrznego obserwatora
Klient wychodzi z obu ról i patrzy na sytuację z zewnątrz, jak niezaangażowany obserwator.
- "Gdybyś był/-a życzliwym obserwatorem tej sytuacji – co byś widział/-a?"
- "Co doradziłbyś/-abyś obu stronom?"
- "Jakie wzorce dostrzegasz?"

## Przebieg ćwiczenia
1. Zaznacz fizycznie trzy miejsca (krzesła, miejsca w przestrzeni)
2. Klient siada/staje w I pozycji i opowiada sytuację
3. Klient przechodzi do II pozycji i mówi jako tamta osoba
4. Klient przechodzi do III pozycji i obserwuje
5. Powrót do I pozycji z nowym wglądem`,
        example: `**Sytuacja:** Klientka ma konflikt z szefem, który "jej nie docenia".

**I pozycja (klientka):**
**Coach:** Opowiedz mi z własnej perspektywy, co się dzieje.
**Klientka:** On nigdy mnie nie chwali. Robię wszystko dobrze i cisza. Czuję się niewidzialna.

**II pozycja (szef):**
**Coach:** Teraz wejdź w perspektywę szefa. Co on widzi, co czuje?
**Klientka:** (po chwili) ...Chyba jest bardzo zajęty. Zarządza dużym zespołem. Może zakłada, że jak coś jest dobrze, to nie trzeba mówić?

**III pozycja (obserwator):**
**Coach:** Patrząc na obie te osoby z zewnątrz – co widzisz?
**Klientka:** Dwie osoby z innymi oczekiwaniami, które nigdy o tym nie rozmawiały.

**Powrót do I pozycji:**
**Coach:** Co to odkrycie zmienia dla Ciebie?
**Klientka:** Może powinnam po prostu powiedzieć szefowi, że potrzebuję informacji zwrotnej.`,
      },
      {
        userId: null,
        name: "Pytania Solution-Focused",
        category: "Technika",
        tags: "cel,motywacja,zmiana",
        description: `Pytania skoncentrowane na rozwiązaniach (Solution-Focused Questions) pochodzą z nurtu Solution-Focused Brief Therapy (SFBT), opracowanego przez Steve'a de Shazera i Insoo Kim Berg. W coachingu stanowią potężne narzędzie zmiany perspektywy z problemu na rozwiązanie.

Głównym założeniem jest to, że klient nie potrzebuje rozumieć problemu, żeby go rozwiązać – potrzebuje wiedzieć, jak wygląda rozwiązanie i co robi inaczej, gdy problem nie istnieje. Technika skupia się na wyjątkach od problemu i zasobach klienta.

Pytania SF są szczególnie pomocne, gdy: klient utknął w analizie przyczyn, chce szybkiego impulsu do działania, skupia się bardziej na tym, co nie działa, niż na tym, co działa.`,
        structure: `## Kluczowe pytania Solution-Focused

### Pytanie o cud (Miracle Question)
"Wyobraź sobie, że podczas Twojego snu dzieje się cud i problem, z którym tu przyszedłeś/-aś, znika. Rano się budzisz – co jest inaczej? Po czym poznasz, że cud się wydarzył?"

### Pytania o wyjątki
- "Kiedy ten problem jest mniejszy lub nie istnieje?"
- "Co się dzieje w tych sytuacjach inaczej?"
- "Co Ty robisz inaczej, gdy problem nie jest tak duży?"

### Pytania o zasoby
- "Co pomogło Ci dotąd nie dać się problemowi bardziej?"
- "Jakie mocne strony pomagają Ci sobie z tym radzić?"

### Pytania skalujące (wariant SF)
- "Na skali 1-10, gdzie 10 to cud już się wydarzył – gdzie jesteś?"
- "Co sprawia, że jesteś na [X], a nie na 1?"
- "Co Cię posunie o 1 punkt do góry?"

### Pytania o małe kroki
- "Jaki byłby jeden mały znak, że idziesz w dobrym kierunku?"
- "Gdybyś miał/-a zrobić jeden mały krok – jaki by to był?"

### Pytania komplementacyjne
- "Jak sobie z tym radzisz, biorąc pod uwagę jak trudna jest ta sytuacja?"`,
        example: `**Sytuacja:** Klient "zawsze odkłada na później" ważne zadania.

**Coach:** Kiedy to odkładanie jest mniejsze? Kiedy zdarzało Ci się zrobić coś szybko?
**Klient:** Hmm... Projekt dla klienta X. Zrobiłem go w jeden wieczór.

**Coach:** Co było inaczej wtedy?
**Klient:** Był konkretny deadline i wyraźna konsekwencja. I wiedziałem dokładnie, czego chce klient.

**Coach:** Wyobraź sobie, że jutro budzisz się i odkładanie zniknęło. Co zauważasz pierwszego?
**Klient:** Mam listę zadań i zaczynam od najtrudniejszego. Nie sprawdzam telefonu przez pierwszą godzinę.

**Coach:** Co z tego możesz zrobić jutro?
**Klient:** Mogę ustawić timer na 45 minut i wyłączyć powiadomienia. Spróbuję.`,
      },
      {
        userId: null,
        name: "Appreciative Inquiry",
        category: "Podejście",
        tags: "motywacja,zmiana,refleksja",
        description: `Appreciative Inquiry (AI), po polsku "Doceniające Badanie" lub "Wdzięczne Dochodzenie", to podejście do zmiany i rozwoju opracowane przez Davida Cooperridera i Suresha Srivastvę na Case Western Reserve University w latach 80. XX wieku. Opiera się na założeniu, że organizacje i ludzie rozwijają się najlepiej, gdy skupiają się na tym, co działa, zamiast na problemach.

W coachingu AI stosuje się do eksploracji szczytowych doświadczeń klienta, odkrywania jego wartości i mocnych stron oraz budowania wizji przyszłości opartej na tym, co już jest dobre. Podejście jest szczególnie skuteczne dla osób, które mają tendencję do skupiania się na deficytach lub krytykowania siebie.

Model 5D: Define (Zdefiniuj), Discover (Odkryj), Dream (Marzenie), Design (Zaprojektuj), Destiny/Deploy (Realizuj) – prowadzi przez cały cykl zmiany opartej na mocnych stronach.`,
        structure: `## Model 5D – Appreciative Inquiry

### D1 – Define (Zdefiniuj)
Ustalenie, czym się zajmiemy – sformułowanie tematu pozytywnie.
- Zamiast "problem z motywacją" → "szczyty mojej motywacji"
- "Jak chcesz nazwać temat naszej pracy?"

### D2 – Discover (Odkryj)
Eksploracja najlepszych doświadczeń klienta.
- "Opowiedz mi o czasie, gdy [temat] był na najwyższym poziomie."
- "Co wtedy robiłeś/-aś? Kto był obok? Co sprawiało, że to działało?"
- "Jakie Twoje mocne strony się wtedy ujawniły?"

### D3 – Dream (Marzenie)
Wyobrażenie idealnej przyszłości.
- "Wyobraź sobie, że masz to, czego chcesz. Opisz to szczegółowo."
- "Co będzie możliwe, gdy osiągniesz to marzenie?"

### D4 – Design (Zaprojektuj)
Planowanie konkretnych kroków opartych na mocnych stronach.
- "Co z tego, co działało wcześniej, możesz teraz zastosować?"
- "Jakie konkretne działania zaprowadziłyby Cię do marzenia?"

### D5 – Destiny/Deploy (Realizuj)
Zobowiązanie do działania i monitorowanie postępów.
- "Jaki jest Twój pierwszy krok?"
- "Jak będziesz świętował/-a postępy?"`,
        example: `**Sytuacja:** Klientka chce poprawić swoje relacje w zespole.

**Coach:** Zamiast skupiać się na problemach, opowiedz mi o czasie, gdy współpraca z zespołem szła naprawdę dobrze.
**Klientka:** Rok temu, przy projekcie X. Byliśmy naprawdę zgrani.

**Coach:** Co wtedy robiłaś inaczej?
**Klientka:** Organizowałam krótkie spotkania co tydzień. I zawsze zaczynałam od "co idzie dobrze".

**Coach:** Wyobraź sobie, że za 3 miesiące zespół znów funkcjonuje tak jak wtedy. Co widzisz?
**Klientka:** Ludzie sami proponują rozwiązania. Jest otwartość. Spotkania są krótkie i konkretne.

**Coach:** Co z tego, co działało rok temu, możesz zacząć robić znowu?
**Klientka:** Mogę wrócić do tych cotygodniowych spotkań. I zaczynać od pozytywów.`,
      },
      {
        userId: null,
        name: "Model SPACE",
        category: "Model",
        tags: "przekonania,motywacja,refleksja",
        description: `Model SPACE to holistyczne narzędzie coachingowe opracowane przez Nicka Edgingtona, które integruje pięć wymiarów doświadczenia: **S** – Somatic (Somatyczny/Cielesny), **P** – Perceptual (Percepcyjny), **A** – Action (Działanie), **C** – Cognition (Myślenie/Przekonania), **E** – Emotion (Emocje).

Model opiera się na założeniu, że zmiana jest trwała tylko wtedy, gdy obejmuje wszystkie pięć wymiarów. Sama zmiana myślenia (C) bez uwzględnienia ciała (S) i emocji (E) często nie prowadzi do trwałej zmiany zachowania. Dlatego SPACE zachęca do pracy ze wszystkimi aspektami ludzkiego doświadczenia.

Model jest szczególnie przydatny, gdy klient "wie, co powinien robić, ale nie robi" – wskazuje, który wymiar blokuje działanie.`,
        structure: `## Pięć wymiarów SPACE

### S – Somatic (Ciało)
Jak ciało reaguje na daną sytuację lub wyzwanie?
- "Jak czujesz tę sytuację w ciele?"
- "Gdzie w ciele czujesz napięcie / dyskomfort / lekkość?"
- "Jaką postawę przyjmujesz, myśląc o tym?"

### P – Perceptual (Percepcja)
Jak klient postrzega i interpretuje sytuację?
- "Jak widzisz tę sytuację?"
- "Co najbardziej przyciąga Twoją uwagę?"
- "Jakiej perspektywy Ci brakuje?"

### A – Action (Działanie)
Co klient robi / co chce robić?
- "Co robisz, gdy pojawia się ta sytuacja?"
- "Jakie zachowania chcesz zmienić lub wzmocnić?"

### C – Cognition (Myślenie/Przekonania)
Jakie myśli, przekonania, wartości są aktywne?
- "Co mówisz sobie w tej sytuacji?"
- "Jakie przekonania kierują Twoim działaniem?"
- "Co jest dla Ciebie tutaj najważniejsze (wartość)?"

### E – Emotion (Emocje)
Jakie emocje towarzyszą sytuacji?
- "Co czujesz w tej sytuacji?"
- "Jakie emocje są silne?"
- "Co ta emocja chce Ci powiedzieć?"

## Zastosowanie diagnostyczne
Zapytaj klienta o każdy z wymiarów → zidentyfikuj, gdzie jest "blokada" → pracuj z tym wymiarem.`,
        example: `**Sytuacja:** Klient "wie, że powinien rozmawiać z szefem, ale ciągle odkłada".

**Coach:** Gdy wyobrażasz sobie tę rozmowę – co się dzieje w ciele? (S)
**Klient:** Napięcie w gardle. Jakby coś mnie ściskało.

**Coach:** Co mówisz sobie o tej rozmowie? (C)
**Klient:** Że skończy się kłótnią. Że szef mnie nie wysłucha.

**Coach:** Skąd pochodzi to przekonanie?
**Klient:** Poprzednia rozmowa z nim skończyła się źle.

**Coach:** Co czujesz w związku z tą sytuacją? (E)
**Klient:** Strach. I trochę złości, że muszę walczyć o podstawy.

**Coach:** Co robisz teraz z tymi uczuciami? (A)
**Klient:** Unikam. Mailuje zamiast rozmawiać.

**Coach:** Biorąc pod uwagę wszystko, co powiedziałeś – co teraz rozumiesz o tej sytuacji?
**Klient:** Że mój strach z przeszłości kontroluje moje działania. Tamta rozmowa to nie ta rozmowa.`,
      },
      {
        userId: null,
        name: "Poziomy Logiczne Diltsa",
        category: "Model",
        tags: "rola,przekonania,zmiana",
        description: `Poziomy Logiczne (znane też jako Góra Lodowa Diltsa lub Poziomy Neurologiczne) to model stworzony przez Roberta Diltsa na podstawie prac Gregory'ego Batesona. Opisuje sześć hierarchicznych poziomów, na których może zachodzić zmiana: Środowisko, Zachowanie, Umiejętności, Przekonania i Wartości, Tożsamość oraz Misja/Duchowość.

Kluczowe założenie: zmiany na niższych poziomach (np. zachowanie) są łatwiejsze i szybsze, ale mało trwałe, jeśli nie są spójne z poziomami wyższymi (przekonania, tożsamość). I odwrotnie – zmiana na poziomie tożsamości lub przekonań automatycznie zmienia zachowanie.

Model jest szczególnie przydatny, gdy klient mówi "wiem, co powinienem robić, ale nie robię" – zwykle wskazuje to na konflikt między zachowaniem a przekonaniami lub tożsamością. Narzędzie pomaga zlokalizować, na którym poziomie leży prawdziwy opór.`,
        structure: `## Sześć poziomów (od najniższego)

### 1. Środowisko (Gdzie? Kiedy? Z kim?)
Zewnętrzne warunki, otoczenie, kontekst.
- "W jakim środowisku działasz?"
- "Kto i co Cię otacza?"

### 2. Zachowanie (Co robię?)
Konkretne działania i reakcje.
- "Co dokładnie robisz w tej sytuacji?"
- "Jak się zachowujesz?"

### 3. Umiejętności (Jak?)
Strategie, kompetencje, "know-how".
- "Jakie umiejętności stosujesz?"
- "Czego Ci brakuje, żeby to zrobić?"

### 4. Przekonania i Wartości (Dlaczego?)
Co uważam za prawdziwe, co jest dla mnie ważne.
- "Co wierzysz na temat tej sytuacji?"
- "Co jest dla Ciebie w tym ważne?"
- "Co musisz wierzyć, żeby działać inaczej?"

### 5. Tożsamość (Kim jestem?)
Poczucie własnego "ja", rola, misja.
- "Kim jesteś w tej roli?"
- "Jakim typem człowieka / lidera / rodzica się uważasz?"

### 6. Misja / Duchowość (Po co? Dla kogo?)
Przynależność do czegoś większego, cel wyższy.
- "Czemu to służy poza Tobą?"
- "Jaki jest głębszy sens tej zmiany?"

## Jak używać diagnostycznie
1. Zadaj pytania na każdym poziomie od dołu do góry
2. Znajdź poziom, gdzie pojawia się opór lub niejasność
3. Pracuj na tym poziomie – zmiana tam promieniuje w dół`,
        example: `**Sytuacja:** Klient chce delegować zadania, ale ciągle to robi sam.

**Coach:** Co dokładnie się dzieje – co robisz zamiast delegować? (Zachowanie)
**Klient:** Biorę zadanie z powrotem, gdy widzę, że idzie wolno lub inaczej niż bym chciał.

**Coach:** Co musisz umieć, żeby delegować? (Umiejętności)
**Klient:** Chyba dawać jasne instrukcje i... tolerować inne podejście.

**Coach:** Co wierzysz o swojej pracy i jakości? (Przekonania)
**Klient:** Że jeśli coś ma być dobrze zrobione, muszę zrobić to sam. Inni popełniają błędy.

**Coach:** Kim jesteś w tej roli – jak siebie definiujesz? (Tożsamość)
**Klient:** Jestem osobą, która dba o jakość. Odpowiedzialnym ekspertem.

**Coach:** Co by się stało z Twoją tożsamością, gdybyś delegował?
**Klient:** ...Chyba bałbym się stracić kontrolę. Że przestanę być "tym ekspertem".

**Coach:** Co by oznaczało być ekspertem, który potrafi rozwijać innych?
**Klient:** To byłoby coś innego. I chyba ważniejszego.`,
      },
      {
        userId: null,
        name: "Model SMS (Subiektywna Mapa Sytuacji)",
        category: "Technika",
        tags: "cel,motywacja,diagnoza",
        description: `Model SMS (Subiektywna Mapa Sytuacji) to kreatywna technika coachingowa oparta na akronimie, która pomaga klientom wyjść z poczucia chaosu poprzez rozbicie problemu lub celu na konkretne elementy i skojarzenia. Szczególnie skuteczna na początku procesu lub gdy klient "nie wie od czego zacząć".

Technika łączy elementy mind mappingu z podejściem skoncentrowanym na rozwiązaniach. Klient rozkłada jedno słowo-klucz (cel, problem, temat) na skojarzenia, a następnie identyfikuje konkretne aktywności i priorytety.

Zastosowania: sesje otwierające nowy cel lub temat, praca z klientem przytłoczonym nadmiarem zadań lub myśli, budowanie inspiracji i nowych perspektyw, konkretyzacja abstrakcyjnych celów.`,
        structure: `## Przebieg techniki SMS

### Krok 1 – S: Słowo kluczowe
Wybierz jedno słowo reprezentujące cel, sytuację lub temat.
- "Gdybyś miał/-a opisać to jednym słowem, jakie by to było?"
- Wpisz to słowo w centrum arkusza / tablicy

### Krok 2 – M: Mapa skojarzeń
Rozwijaj swobodne skojarzenia od słowa centralnego.
- "Co się z tym kojarzy? Co jeszcze?"
- Zapisuj wszystko – bez oceniania, bez filtrowania
- Minimum 10–15 skojarzeń w różnych kierunkach
- Można gałęziować: od skojarzenia do kolejnego skojarzenia

### Krok 3 – S: Selekcja i konkretyzacja
Wybierz 3–5 najważniejszych skojarzeń i zamień je na konkretne działania.
- "Które z tych skojarzeń najbardziej rezonuje?"
- "Co konkretnie możesz zrobić w związku z tym?"
- "Jakie aktywności wynikają z tej mapy?"

## Wariant zaawansowany: SMS + Priorytetyzacja
Po mapie zapytaj: "Gdybyś mógł/-a zająć się tylko jedną rzeczą – co by to było?"`,
        example: `**Sytuacja:** Klientka "chce się rozwijać zawodowo, ale nie wie jak i od czego zacząć".

**Coach:** Gdybyś miała opisać to, czego chcesz, jednym słowem – co to jest?
**Klientka:** Wzrost. Albo... nie, chyba "przełom".

**Coach:** Okej, "przełom" w centrum. Co Ci się z tym kojarzy?
**Klientka:** Zmiana, ryzyko, nowe, strach, szansa, decyzja, pieniądze, kurs, coaching, awans, widoczność...

**Coach:** Które z tych słów najbardziej rezonuje?
**Klientka:** "Widoczność". Bo właśnie tego mi brakuje – nikt w firmie mnie nie zna poza moim działem.

**Coach:** Co konkretnie możesz zrobić w związku z widocznością?
**Klientka:** Zabrać głos na następnym spotkaniu zarządu. Napisać artykuł na bloga firmowego. Poprosić szefa o prezentację projektu.

**Coach:** Który z tych kroków chcesz podjąć jako pierwszy?`,
      },
      {
        userId: null,
        name: "Matryca Celów (Chcę / Mam)",
        category: "Narzędzie",
        tags: "cel,diagnoza,zmiana",
        description: `Matryca Celów (znana też jako Matryca Chcę/Nie chcę – Mam/Nie mam) to klasyczne narzędzie diagnostyczne w coachingu, które pomaga klientowi uświadomić sobie aktualną sytuację (co ma i czego nie ma) w relacji do tego, czego chce i czego nie chce.

Narzędzie tworzy cztery ćwiartki, z których każda ma inne znaczenie: obszar spełnienia (Chcę i Mam), obszar motywacji do zmiany (Chcę, ale nie mam), obszar unikania (Mam, ale nie chcę) oraz obszar niezaangażowania (Nie chcę i nie mam).

Szczególnie pomocne, gdy: klient "nie wie czego chce", czuje się utknięty w obecnej sytuacji, skupia się na tym czego nie ma zamiast na tym co ma, lub nie dostrzega swoich zasobów.`,
        structure: `## Cztery ćwiartki matrycy

### ✅ Chcę i Mam (Spełnienie / Zasoby)
To, co klient ma i chce mieć – jego zasoby, mocne strony, spełnione obszary.
- "Co masz i jesteś z tego zadowolony/-a?"
- "Jakie zasoby, umiejętności, relacje już posiadasz?"
- Praca: Wzmacnianie, docenianie, budowanie na tym

### 🎯 Chcę, ale Nie mam (Motywacja / Cel)
Obszar zmiany i celów – co klient chce osiągnąć, a jeszcze nie ma.
- "Czego pragniesz, a jeszcze tego nie osiągnąłeś/-aś?"
- "Co chcesz mieć za 6–12 miesięcy?"
- Praca: Planowanie, budowanie drogi, działanie

### ⚠️ Mam, ale Nie chcę (Unikanie / Hamowanie)
Sytuacje, relacje, nawyki, które klient ma, a których nie chce – obszar unikania lub odkładania.
- "Co masz w swoim życiu, a chciałbyś się tego pozbyć?"
- "Co Cię ogranicza lub ciągnie w dół?"
- Praca: Odważne decyzje, zmiana, ustanawianie granic

### ⭕ Nie chcę i Nie mam (Neutralne / Niezaangażowane)
Obszary bez znaczenia dla klienta – nieistotne, poza polem uwagi.
- Praca: Potwierdzenie, że to nie jest ważne – można odpuścić

## Jak przeprowadzić ćwiczenie
1. Narysuj matrycę 2×2 na kartce lub tablicy
2. Klient wypełnia każdą ćwiartkę – min. 3 elementy na kwadrat
3. Omów razem: co jest ważne? gdzie jest napięcie?
4. Wybierz 1-2 obszary do pracy`,
        example: `**Sytuacja:** Klient "czuje się utknięty w pracy, ale nie wie co zmienić".

**Coach:** Narysujmy matrycę. Zacznijmy od lewego górnego – co masz i jesteś z tego zadowolony?
**Klient:** Dobry zespół, spokojne tempo, bezpieczeństwo, znajomość procesów.

**Coach:** Dobrze. Co chcesz, a jeszcze nie masz?
**Klient:** Nowe wyzwania, wyższe stanowisko, projekt z wpływem na biznes, lepsze wynagrodzenie.

**Coach:** Teraz trudniejsze – co masz, a czego nie chcesz?
**Klient:** ...Monotonię. Spotkania, które nic nie wnoszą. I chyba relację z moim szefem – jest nieprzewidywalny.

**Coach:** Co zauważasz, patrząc na tę mapę całościowo?
**Klient:** Że mam bezpieczeństwo, ale cena za nie jest wysoka. Właściwie to co mam, a czego nie chcę, zjada motywację do walki o to co chcę.

**Coach:** Co chcesz zrobić z tą informacją?`,
      },
      {
        userId: null,
        name: "Technika Cel–Efekt (Podróż mentalna)",
        category: "Technika",
        tags: "cel,motywacja,zmiana",
        description: `Technika Cel–Efekt (zwana też Podróżą mentalną lub Wizualizacją Efektu) to głęboka praca z motywacją, która łączy zdefiniowany cel z emocjonalnym i fizycznym odczuciem jego realizacji. Przechodzi od "co chcę osiągnąć?" do "jak się będę czuć gdy to osiągnę?" i "jakie moje potrzeby zostaną zaspokojone?".

Technika czerpie z podejść psychologii pozytywnej i coachingu opartego na wartościach. Kluczowe założenie: samo zdefiniowanie celu (co?) rzadko wystarcza jako motywator – klient potrzebuje żywego wyobrażenia efektu (jak?) i zrozumienia, jakie głębsze potrzeby realizuje.

Szczególnie skuteczna, gdy: klient "wie czego chce, ale nie czuje siły do działania", cele są abstrakcyjne lub "powinowościowe" (powinienem chcieć X), lub motywacja szybko opada po sesji.`,
        structure: `## Etapy techniki

### Etap 1 – Cel (Co?)
Precyzyjne sformułowanie celu.
- "Co dokładnie chcesz osiągnąć?"
- "Jak będziesz wiedział/-a, że cel jest zrealizowany?"
- "W jakim czasie?"

### Etap 2 – Przeniesienie w przyszłość
Wizualizacja momentu realizacji celu.
- "Wyobraź sobie, że to już się stało. Gdzie jesteś?"
- "Co widzisz wokół siebie? Co słyszysz?"
- "Kto jest obok? Co mówią?"

### Etap 3 – Efekt emocjonalny (Jak się czujesz?)
Połączenie z emocjami i doznaniami ciała.
- "Co czujesz w tym momencie?"
- "Jak to czucie jest w ciele – gdzie je zauważasz?"
- "Jedno słowo na to uczucie – jakie?"

### Etap 4 – Potrzeby (Dlaczego to jest ważne?)
Identyfikacja głębszych potrzeb zaspokajanych przez cel.
- "Co ważnego dla Ciebie jest w tym uczuciu?"
- "Jaka potrzeba zostanie zaspokojona?"
- "Co ten cel mówi o Twoich wartościach?"

### Etap 5 – Pierwszy krok (Paliwo w działanie)
Przeniesienie energii w konkretny krok.
- "Mając to uczucie i tę świadomość – co chcesz zrobić już teraz?"
- "Jaki jest Twój pierwszy krok na dziś/ten tydzień?"`,
        example: `**Sytuacja:** Klient chce "zdobyć nową pracę w IT", ale jest mało zmotywowany do działania.

**Coach:** Wyobraź sobie, że jest poniedziałek za 4 miesiące. Dostałeś ofertę pracy marzeń i właśnie podpisujesz umowę. Gdzie jesteś?
**Klient:** W biurze nowej firmy... albo w kawiarni, bo tu podpisujemy zdalnie.

**Coach:** Co widzisz, co słyszysz?
**Klient:** Ekran z dokumentem. Piszę podpis. Telefon do żony "udało się".

**Coach:** Co czujesz w tym momencie?
**Klient:** Ulga. Duma. I jakby... spokój. Że w końcu zrobiłem to dla siebie.

**Coach:** Gdzie w ciele czujesz tę ulgę?
**Klient:** Ramiona opadają. Tu, w klatce piersiowej – jakby coś przestało uciskać.

**Coach:** Co ważnego zaspokaja ten cel – jaką potrzebę?
**Klient:** Chyba to, że sam zadecyduję o swojej ścieżce. Przestanę czuć się uwięziony.

**Coach:** Z tym uczuciem i tą świadomością – co chcesz zrobić po naszej sesji?
**Klient:** Zaktualizować CV. Dziś. Naprawdę dziś.`,
      },
      {
        userId: null,
        name: "Model GOLD (Coaching Interwencyjny)",
        category: "Model",
        tags: "refleksja,decyzja,kariera",
        description: `Model GOLD to narzędzie coachingowe służące do pracy z konkretnymi zdarzeniami i doświadczeniami – retrospektywnym analizowaniem sytuacji i wyciąganiem wniosków do działania. Akronim rozwijany jest jako: **G** – Goal (Cel), **O** – Outcome (Wynik/Co się wydarzyło), **L** – Learn (Czego się nauczyłem/-am), **D** – Do differently (Co zrobię inaczej).

Model doskonale sprawdza się w coachingu menedżerskim, gdy klient właśnie przeszedł przez ważne wydarzenie (trudna rozmowa, nieudany projekt, prezentacja), oraz w sesjach podsumowujących etap procesu coachingowego. Łączy analizę przeszłości z planowaniem przyszłości.

Kiedy używać: analiza konkretnego zdarzenia lub trudnej sytuacji, zakończenie etapu lub całego procesu, sesja "retro" – co zadziałało, czego się nauczyłem/-am, praca z menedżerami po ważnych decyzjach lub spotkaniach.`,
        structure: `## Cztery kroki GOLD

### G – Goal (Cel)
Jaki był zamierzony cel lub oczekiwanie przed zdarzeniem?
- "Co chciałeś/-aś osiągnąć?"
- "Jaki był Twój plan / oczekiwanie?"
- "Po czym miałeś/-aś poznać, że się udało?"

### O – Outcome (Wynik)
Co faktycznie się wydarzyło – jak wyglądał rezultat?
- "Co się wydarzyło?"
- "Jaki był faktyczny wynik?"
- "Co osiągnąłeś/-aś, a co nie wyszło tak jak planowałeś/-aś?"

### L – Learn (Uczenie się)
Jakie wnioski i nauki płyną z tego doświadczenia?
- "Czego się nauczyłeś/-aś z tej sytuacji?"
- "Co zrobiłeś/-aś dobrze?"
- "Co zaskoczyło Cię – o sobie, o innych, o sytuacji?"

### D – Do Differently (Zrobię inaczej)
Jakie konkretne zmiany lub nowe podejście w podobnych sytuacjach?
- "Co zrobisz inaczej następnym razem?"
- "Jakie konkretne działanie chcesz podjąć?"
- "Co chcesz przenieść do przyszłych sytuacji?"`,
        example: `**Sytuacja:** Klientka przeprowadziła trudną rozmowę z podwładnym w sprawie wyników – poczuła, że nie wyszło tak jak chciała.

**Coach:** Jaki był Twój cel przed tą rozmową? (G)
**Klientka:** Chciałam powiedzieć wprost, że jego wyniki są poniżej oczekiwań, i ustalić konkretny plan poprawy.

**Coach:** Co faktycznie się wydarzyło? (O)
**Klientka:** Zaczęłam, powiedziałam o wynikach, ale potem trochę się zagubiłam. On zaczął się tłumaczyć, ja słuchałam za długo, i skończyłyśmy bez żadnego planu. Wyszłam z poczuciem, że nic nie ustaliłam.

**Coach:** Czego się nauczyłaś? (L)
**Klientka:** Że wchodzę w tryb słuchacza zbyt szybko. I że nie miałam przygotowanego konkretnego "co dalej" – liczyłam, że samo wyjdzie w rozmowie.

**Coach:** Co zrobisz inaczej? (D)
**Klientka:** Następnym razem przygotuję wcześniej 2-3 konkretne opcje planu i powiem wprost: "Potrzebuję, żebyśmy skończyli tę rozmowę z konkretnym krokiem." I nie skończę spotkania bez tego.`,
      },
      {
        userId: null,
        name: "Bilans Kapitału Relacyjnego",
        category: "Narzędzie",
        tags: "relacje,kariera,diagnoza",
        description: `Bilans Kapitału Relacyjnego (znany też jako Ćwiczenie 6 osób lub Analiza Środowiska) to narzędzie diagnostyczne badające wpływ otoczenia klienta na kluczowe obszary jego życia. Opiera się na założeniu, że jesteśmy średnią pięciu (lub sześciu) osób, z którymi spędzamy najwięcej czasu – i że nasze środowisko relacyjne bezpośrednio wpływa na nasze możliwości, przekonania i energię.

Technika pochodzi z tradycji coachingu kariery i life-coachingu. Klient analizuje swoje 6 kluczowych relacji pod kątem tego, jak wpływają na jego: finanse i karierę, intelekt i uczenie się, energię i emocje, wartości i decyzje.

Szczególnie pomocne gdy: klient czuje, że środowisko go ogranicza, stoi w obliczu ważnej decyzji dotyczącej relacji, lub chce świadomie budować środowisko sprzyjające celom.`,
        structure: `## Przebieg ćwiczenia

### Krok 1 – Lista 6 osób
Klient wypisuje 6 osób, z którymi spędza najwięcej czasu (prywatnie i zawodowo).
- Partnerzy, rodzina, przyjaciele, współpracownicy, mentorzy
- Ważne: faktycznie spędza czas, nie idealnie chciałby

### Krok 2 – Analiza wpływu (tabela)
Dla każdej osoby klient ocenia wpływ (+ pozytywny / - negatywny / 0 neutralny) w 4 obszarach:

| Osoba | Finanse / Kariera | Intelekt / Wiedza | Energia / Emocje | Wartości / Decyzje |
|-------|-------------------|-------------------|-------------------|--------------------|
| ...   | +/-/0             | +/-/0             | +/-/0             | +/-/0              |

### Krok 3 – Wnioski i refleksja
- "Co zauważasz patrząc na tę tabelę?"
- "Które relacje Cię wzmacniają? Które wyczerpują?"
- "Co mówi ta mapa o Twoim obecnym środowisku?"

### Krok 4 – Decyzje
- "Gdybyś mógł/-a świadomie zaprojektować swoje środowisko – co byś zmienił/-a?"
- "Kogo chcesz mieć więcej w swoim życiu? Kogo mniej?"
- "Kogo brakuje w Twojej tabeli, a powinien tam być?"`,
        example: `**Sytuacja:** Klient czuje, że "nie może się rozwinąć" mimo starań.

**Coach:** Wypisz 6 osób, z którymi spędzasz najwięcej czasu w pracy i poza nią.
**Klient:** Szef, żona, 2 współpracownicy z biura, znajomy z liceum, i chyba rodzice – widuję ich co tydzień.

**Coach:** Oceń teraz każdą z tych osób – jak wpływa na Twoje finanse i karierę?
**Klient:** (po chwili) Szef – plus, motywuje. Żona – plus, wspiera. Współpracownicy – raczej zero, nie rozmawiamy o karierze. Znajomy z liceum – minus, ciągle narzeka że praca jest bez sensu. Rodzice – minus, uważają że "taka praca jest dobra, nie szukaj problemów".

**Coach:** Co zauważasz?
**Klient:** Że dwie osoby, z którymi spędzam dużo czasu, aktywnie zniechęcają do rozwoju. To trochę wstrząsające.

**Coach:** Gdybyś mógł świadomie zaprojektować swoje środowisko – kogo chcesz mieć więcej?
**Klient:** Kogoś, kto już przeszedł przez zmianę kariery. Może mentora. Albo grupy mastermind.`,
      },
      {
        userId: null,
        name: "Góra Lodowa (Poziomy Logiczne)",
        category: "Technika",
        tags: "rola,przekonania,refleksja",
        description: `Technika Góry Lodowej opiera się na koncepcji poziomów logicznych Roberta Diltsa i pracy z systemami przekonań Virginia Satir. Metafora góry lodowej doskonale oddaje istotę pracy z tożsamością: **nad wodą** widoczne są zachowania i środowisko – to, co obserwujemy i co oceniają inni. **Pod wodą** kryje się to, co napędza lub blokuje zmianę: emocje, przekonania, wartości i tożsamość.

Technika służy do oddzielenia tego, co zewnętrzne i widoczne (działania, rola, zachowania), od tego, co głębokie i ukryte (wartości, sens, poczucie kim jestem). Zmiana na poziomie zachowania bez dotknięcia głębszych warstw jest często nieskuteczna lub nietrwała.

Technika jest **idealna dla klientów w kryzysie roli** – gdy to, co muszą robić zawodowo, kłóci się z tym, kim czują się w głębi. Przykłady: HR-owiec zmuszony do zwolnień, menedżer wdrażający decyzje, z którymi się nie zgadza, lider tracący sens swojej misji.`,
        structure: `## Pięć poziomów góry lodowej

---

### 🌊 NAD WODĄ (widoczne)

#### Poziom 1 – Środowisko i Zachowania
*Co klient robi? Gdzie, z kim i w jakich okolicznościach?*
- "Co konkretnie robisz w tej roli?"
- "W jakich sytuacjach to zachowanie się pojawia?"
- "Kto i co jest wokół Ciebie?"

---

### 〰️ LINIA WODY (punkt napięcia)

#### Poziom 2 – Emocje
*Co czuje, pełniąc tę rolę? Jakie emocje pojawiają się regularnie?*
- "Co czujesz, gdy to robisz?"
- "Jakie emocje towarzyszą Ci najczęściej w tej roli?"
- "Czy jest w tym jakaś emocja, której wolisz nie zauważać?"

> 💡 To tutaj często ujawnia się napięcie – emocja jest sygnałem, że coś „pod wodą" jest niespójne z tym, co „nad wodą".

---

### 🧊 POD WODĄ (ukryte)

#### Poziom 3 – Umiejętności i Przekonania
*Co potrafi? W co wierzy na temat siebie, innych i świata?*
- "Co musisz wierzyć o sobie, żeby to robić?"
- "Jakie przekonanie stoi za tym zachowaniem?"
- "Co myślisz o ludziach, którymi zarządzasz / których dotykają Twoje decyzje?"

#### Poziom 4 – Wartości i Tożsamość *(Rdzeń)*
*Co jest dla niego naprawdę ważne? Kim jest w głębi duszy?*
- "Co jest dla Ciebie naprawdę ważne w pracy i w życiu?"
- "Kim jesteś, gdy zdejmujesz maskę zawodową?"
- "Jak Twoje działania nad wodą wspierają – lub podważają – Twoje wartości pod wodą?"

#### Poziom 5 – Misja i Wizja *(Fundament)*
*Po co to robi? Jaki jest większy sens jego działań?*
- "Po co w ogóle to robisz?"
- "Jaki jest głębszy sens Twojej pracy – poza obowiązkami i wynagrodzeniem?"
- "Co chcesz, żeby zostało po Tobie w tym miejscu lub w życiach innych ludzi?"

---

## Jak przeprowadzić technikę
1. Narysuj lub pokaż metaforę góry lodowej na kartce / tablicy
2. Zacznij od góry (zachowania) i schódź warstwa po warstwie
3. Zatrzymaj się przy emocji (poziom 2) – to często punkt wejścia do głębszej pracy
4. Kiedy dotrzesz do poziomu 4–5, zapytaj o spójność między tym co "nad wodą" a tym co "pod wodą"
5. Zakończ pytaniem integrującym: *"Co chcesz zrobić z tym, co odkryłeś/-aś?"*`,
        example: `**Sytuacja:** Klientka – HR Business Partner w dużej korporacji – mówi: *"Wykonuję swoją pracę, ale coraz bardziej czuję, że nie jestem sobą."*

---

**Coach:** Opowiedz mi – co konkretnie robisz w swojej roli? *(Poziom 1 – Zachowania)*
**Klientka:** Przeprowadzam rozmowy zwalniające, wdrażam restrukturyzacje, komunikuję trudne decyzje zarządu.

**Coach:** Co czujesz, gdy to robisz? *(Poziom 2 – Emocje / linia wody)*
**Klientka:** *(cisza)* ...Chyba winę. I jakiś rodzaj wstydu. Jakbym była "katem", choć nim nie chcę być.

**Coach:** To ważny sygnał. Co wierzysz o ludziach, z którymi pracujesz? *(Poziom 3 – Przekonania)*
**Klientka:** Że zasługują na szacunek. Że każdy człowiek ma wartość niezależnie od wyników.

**Coach:** A co jest dla Ciebie naprawdę ważne w pracy? *(Poziom 4 – Wartości)*
**Klientka:** Relacyjność. Budowanie. Pomaganie ludziom się rozwijać. To dlatego w ogóle weszłam w HR.

**Coach:** Jak Twoje działania "nad wodą" – zwalnianie, komunikowanie złych decyzji – mają się do tej wartości relacyjności "pod wodą"?
**Klientka:** *(długa pauza)* Są zupełnie sprzeczne. Właśnie dlatego czuję ten wstyd. Robię coś, co niszczy to, w co wierzę.

**Coach:** Kim chcesz być w tej roli – biorąc pod uwagę to, co odkryłaś? *(Poziom 5 – Misja)*
**Klientka:** Chcę być kimś, kto nawet w trudnych sytuacjach zachowuje człowieczeństwo. Może nie mogę zmienić decyzji zarządu – ale mogę zmienić to, jak je przeprowadzam.`,
      },
    ],
  });

  // ── Dane demo — tylko jeśli baza jest pusta (brak użytkowników) ──────────────
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log("✅ Seed zakończony pomyślnie (dane użytkownika zachowane).");
    return;
  }

  const hashedPassword = await bcrypt.hash("coach123", 10);

  const user = await prisma.user.create({
    data: {
      email: "coach@example.com",
      password: hashedPassword,
      name: "Anna Kowalska",
    },
  });

  // ── Klient 1: Marek Nowak ─────────────────────────────────────────────────

  const klient1 = await prisma.client.create({
    data: {
      userId: user.id,
      name: "Marek Nowak",
      company: "TechSolutions Sp. z o.o.",
      role: "Product Manager",
      stage: "W trakcie",
      generalNote:
        "Marek jest doświadczonym menedżerem w branży IT, zmagającym się z przejściem na rolę dyrektora. Główne wyzwania: delegowanie, zarządzanie stresem, budowanie autorytetu.",
    },
  });

  // Sesja 1 – 5 listopada 2024
  await prisma.session.create({
    data: {
      clientId: klient1.id,
      scheduledAt: new Date("2024-11-05T10:00:00"),
      durationMin: 60,
      status: "Odbyta",
      notesMd: `## Kontrakt / cel sesji

Pierwsza sesja coachingowa. Marek chce przepracować temat delegowania zadań – czuje się przeciążony i często kończy pracę innych za nich. Cel: zidentyfikowanie przekonań blokujących delegowanie.

---

## Co powiedział klient (transkrypcja / cytaty)

„Wiem, że powinienem oddawać zadania, ale potem i tak muszę to poprawiać. Szybciej zrobię to sam."

„Czuję, że tracę kontrolę nad projektem, kiedy za dużo deleguję."

„Ludzie w moim zespole są dobrzy, ale nie rozumieją, jak ważna jest jakość dla klienta."

---

## Obserwacje coacha

Marek mówił szybko i z napięciem. Kiedy wspominał o delegowaniu, jego głos stawał się twardszy. Widoczny dyskomfort przy pytaniach o zaufanie do zespołu. Kilka razy westchnął głęboko.

---

## Hipotezy

1. Marek może mieć głęboko zakorzenione przekonanie, że jego wartość jest mierzona jakością pracy, a nie skutecznością zarządzania.
2. Możliwe doświadczenie z przeszłości, gdzie delegowanie skończyło się niepowodzeniem (ryzyko wstydu / krytyki).
3. Perfekcjonizm jako mechanizm kontroli lęku.

---

## Ustalenia / działania

- Marek zobowiązał się w tym tygodniu oddelegować jedno zadanie bez ingerowania w proces jego wykonania.
- Prowadzenie krótkiego dziennika: co czułem, kiedy oddałem zadanie?
- Na kolejnej sesji – omówimy wyniki eksperymentu z delegowaniem.
`,
      summaryMd: `**Sesja 1 – Podsumowanie**

Marek zidentyfikował główny wzorzec: nadkontrolę wynikającą z lęku przed utratą standardów jakości. Kluczowe cytaty wskazują na głębsze przekonanie „zrobię to lepiej sam". Zadanie domowe: eksperyment z delegowaniem bez ingerencji.`,
    },
  });

  // Sesja 2 – 19 listopada 2024
  await prisma.session.create({
    data: {
      clientId: klient1.id,
      scheduledAt: new Date("2024-11-19T10:00:00"),
      durationMin: 60,
      status: "Odbyta",
      notesMd: `## Kontrakt / cel sesji

Omówienie eksperymentu z delegowaniem. Marek chce zrozumieć, dlaczego tak trudno mu było nie ingerować. Cel: głębsza praca nad przekonaniami i wartościami.

---

## Co powiedział klient (transkrypcja / cytaty)

„Oddałem Adamowi raport do przygotowania. Przez pierwsze dwa dni byłem spokojny, ale w środę wieczór zajrzałem do pliku i... poprawiłem połowę."

„Poczułem się jak zdradzający siebie. Obiecałem sobie, że nie zajrzę, a jednak..."

„Ale raport Adama był naprawdę dobry. Może tylko 20% moich poprawek miało sens."

---

## Obserwacje coacha

Marek był wyraźnie zaskoczony własną refleksją dotyczącą poprawek Adama. Moment „ale raport był naprawdę dobry" – pauza, zatrzymanie. Wydawał się autentycznie zaskoczony. Emocja, którą zidentyfikował sam: wstyd z powodu złamania obietnicy + zaskoczenie, że praca była dobra.

---

## Hipotezy

1. Ingerencja w pracę Adama może wynikać z lęku przed byciem zbędnym – jeśli Adam robi to dobrze, co jest moją rolą?
2. 20% poprawek, które „miały sens" – możliwe racjonalizowanie ingerencji po fakcie.
3. Przekonanie: „wartościowy szef to szef, który wie wszystko i robi wszystko najlepiej".

---

## Ustalenia / działania

- Marek chce napisać odpowiedź na pytanie: „Czym jest moja rola jako menedżera, jeśli nie robieniem wszystkiego najlepiej?"
- Rozmowa z Adamem – feedback dla niego (pierwsze świadome docenianie).
- Kolejna sesja: temat lęku przed zbędnością i redefinicja roli lidera.
`,
      summaryMd: `**Sesja 2 – Podsumowanie**

Eksperyment z delegowaniem ujawnił nowy wątek: lęk przed zbędnością. Przełomowy moment, gdy Marek przyznał, że praca Adama była dobra – otworzyło to przestrzeń do refleksji nad rolą lidera. Kierunek: redefinicja wartości w roli menedżera.`,
    },
  });

  // Sesja 3 – 3 grudnia 2024
  await prisma.session.create({
    data: {
      clientId: klient1.id,
      scheduledAt: new Date("2024-12-03T10:00:00"),
      durationMin: 60,
      status: "Odbyta",
      notesMd: `## Kontrakt / cel sesji

Praca nad redefinicją roli lidera. Marek wrócił z przemyśleniami na temat pytania o rolę. Cel: ustalenie nowej, autentycznej definicji „dobrego szefa" dla Marka.

---

## Co powiedział klient (transkrypcja / cytaty)

„Napisałem te odpowiedzi i doszedłem do czegoś, co mnie trochę zaskoczyło – moja rola to tworzyć warunki, żeby inni mogli działać dobrze. Nie robić za nich."

„To brzmi banalnie, ale kiedy to napisałem, poczułem... ulgę? Jakby coś przestało mnie gnębić."

„Powiedziałem Adamowi, że raport był dobry. Że go nie doceniałem. On... nie wiedział co powiedzieć z zaskoczenia."

---

## Obserwacje coacha

To była inna sesja – Marek był spokojniejszy, wolniejszy w mówieniu. Widoczna ulga w ciele. Rozmowa z Adamem wydaje się być ważnym punktem zwrotnym – Marek zrobił krok ku autentyczności.

---

## Hipotezy

1. Redefinicja roli trafiła w głęboki sens – Marek wydaje się znajdować nowe źródło wartości.
2. Docenianie Adama może być początkiem nowego stylu zarządzania.
3. Pozostaje pytanie: co dzieje się w sytuacjach presji i terminu – czy wzorzec wróci?

---

## Ustalenia / działania

- Marek chce przeprowadzić podobną rozmowę z jedną osobą z zespołu każdego tygodnia.
- Praca z coachem: zaplanowanie trudnego scenariusza – co robię, gdy projekt jest na krawędzi?
- Następna sesja za 3 tygodnie (przerwa świąteczna).
`,
    },
  });

  // Sesja 4 – 14 stycznia 2025
  const sesja4 = await prisma.session.create({
    data: {
      clientId: klient1.id,
      scheduledAt: new Date("2025-01-14T10:00:00"),
      durationMin: 60,
      status: "Odbyta",
      notesMd: `## Kontrakt / cel sesji

Powrót po przerwie świątecznej. Marek chce sprawdzić, czy nowe wzorce utrzymały się pod presją końca roku. Cel: ocena trwałości zmian i planowanie kolejnego etapu.

---

## Co powiedział klient (transkrypcja / cytaty)

„W grudniu mieliśmy kryzys z dużym klientem. Pierwsza myśl: przejąć kontrolę, zrobić wszystko samemu. Ale nie zrobiłem tego."

„Zadzwoniłem do Adama i zapytałem, co proponuje. On zaproponował rozwiązanie, którego ja bym nie wymyślił."

„To był moment, kiedy poczułem, że coś naprawdę się zmieniło. Nie tylko w teorii."

---

## Obserwacje coacha

Marek mówił z wyraźną dumą, ale bez arogancji. Widać dojrzałość – potrafi docenić efekt bez przypisywania go tylko sobie. Stabilniejszy emocjonalnie niż na początku procesu.

---

## Hipotezy

1. Zmiana wydaje się głębsza niż behawioralna – dotknęła poziomu przekonań o własnej roli.
2. Wyzwanie na kolejny etap: co się dzieje, gdy to Marek popełni błąd? Czy nowa tożsamość lidera jest wystarczająco stabilna?

---

## Ustalenia / działania

- Refleksja pisemna: „Czego nauczyłem się o sobie jako liderze w tym procesie?"
- Rozmowa o możliwym zakończeniu lub kontynuacji procesu coachingowego.
- Marek chce zaprosić coacha na superwizję jednej trudnej rozmowy z zespołem (symulacja).
`,
      summaryMd: `**Sesja 4 – Podsumowanie**

Kluczowe potwierdzenie: nowe wzorce Marka utrzymały się w sytuacji kryzysowej. Delegowanie Adamowi przyniosło lepszy wynik niż Marek oczekiwał. Widoczna zmiana tożsamości lidera – od „robię wszystko sam" do „tworzę warunki i ufam zespołowi". Proces zmierza ku zakończeniu lub pracy na głębszym poziomie.`,
    },
  });

  // Podsumowanie po sesji 4 (offboarding)
  // Podsumowanie po sesji 4 (offboarding)
  const offboardingData = {
    date: new Date("2025-01-14"),
    sessionNumber: 4,
    hours: 1.0,
    clientLabel: "M.N.",
    eventTopic: "Weryfikacja trwałości zmian pod presją. Kryzys z klientem w grudniu - Marek zareagował nowym stylem (delegowanie zamiast przejęcia kontroli). Rozmowa o możliwym zakończeniu lub kontynuacji procesu.",
    sessionGoals: "Ocena trwałości nowych wzorców w sytuacji kryzysowej. Refleksja nad tożsamością lidera po 3 miesiącach pracy.",
    learningExperience: "Marek potwierdził, że zmiana dotknęła poziomu przekonań - nie tylko zachowań. Kluczowe: w momencie kryzysu odruchowo sięgnął po delegowanie, nie po kontrolę.",
    techniques: "Pytania retrospektywne, analiza konkretnego zdarzenia (kryzys z klientem), skala progresji (gdzie byłeś, gdzie jesteś).",
    keyInsightsClient: "Zadzwoniłem do Adama i zapytałem, co proponuje. On zaproponował rozwiązanie, którego ja bym nie wymyślił. To był moment, kiedy poczułem, że coś naprawdę się zmieniło.",
    gains: "Utrwalone przekonanie o roli lidera jako twórcy warunków. Zdolność do delegowania w sytuacji wysokiego stresu. Autentyczna duma bez arogancji.",
    homework: "- Refleksja pisemna: Czego nauczyłem się o sobie jako liderze w tym procesie?\n- Zaproszenie coacha na superwizję trudnej rozmowy z zespołem (symulacja)",
    homeworkDescription: "Marek napisze minimum pół strony A4 o własnych odkryciach z całego procesu. Tekst będzie punktem wyjścia do rozmowy zamykającej lub kolejnego etapu pracy.",
    feedback: "Marek docenił, że coaching pozwolił mu zobaczyć wzorzec, którego sam by nie zauważył. Powiedział, że zmiana jest bardziej głęboka, niż myślał na początku.",
    coachReflection: "Sesja potwierdziła, że zmiana jest trwała i dotknęła poziomu tożsamości, nie tylko zachowań. Jako coach: uważam, że warto zapytać o scenariusz błędu Marka - nowa tożsamość nie była testowana porażką. Zadbać o czyste zamknięcie procesu lub świadome przejście na kolejny etap.",
    focusAreas: "1. Stabilność nowej tożsamości lidera w obliczu własnego błędu\n2. Skalowanie nowego stylu zarządzania na cały zespół\n3. Ewentualne zakończenie lub redefinicja dalszego procesu coachingowego",
    additionalNotes: "To była najsilniejsza sesja z dotychczasowych. Marek jest gotowy na zamknięcie etapu lub głębszą pracę. Warto zaproponować sesję zamykającą z retrospektywą pisaną przez samego klienta.",
  };

  await prisma.sessionOffboarding.create({
    data: {
      sessionId: sesja4.id,
      ...offboardingData,
      generatedNoteMd: generateOffboardingNote(offboardingData),
    },
  });

  // Retrospektywa dla Marka
  await prisma.retrospective.create({
    data: {
      clientId: klient1.id,
      truncated: false,
      reportMd: `# Retrospektywa procesu coachingowego
## Klient: Marek Nowak | TechSolutions Sp. z o.o. | Product Manager

**Wygenerowano:** 14 stycznia 2025

---

## Podsumowanie procesu

Proces coachingowy z Markiem obejmuje **4 sesje** (5 listopada 2024 – 14 stycznia 2025), każda trwająca 60 minut. Praca koncentrowała się wokół centralnego tematu: **delegowania i redefinicji roli lidera**.

---

## Kluczowe tematy i wątki

### 1. Delegowanie jako źródło lęku
Na początku procesu Marek identyfikował delegowanie wyłącznie przez pryzmat utraty kontroli nad jakością. Przekonanie „zrobię to lepiej sam" funkcjonowało jako strategia ochronna.

### 2. Lęk przed zbędnością
Nieoczekiwany wątek ujawniony w sesji 2: kiedy Adam wykonał zadanie dobrze, Marek doświadczył chwilowego zagrożenia tożsamości.

### 3. Redefinicja roli
Sesja 3 przyniosła przełom: Marek sformułował nową definicję swojej roli: *„tworzyć warunki, żeby inni mogli działać dobrze"*.

### 4. Weryfikacja pod presją
Sesja 4 potwierdziła trwałość zmiany – Marek utrzymał nowe wzorce w sytuacji kryzysowej.

---

## Postęp i zmiany

| Obszar | Start | Teraz |
|--------|-------|-------|
| Delegowanie | Niemożliwe bez ingerencji | Naturalny odruch, z zaufaniem |
| Samoświadomość | Niska | Wysoka, z refleksją na bieżąco |
| Relacje w zespole | Jednostronne | Partnerskie, z docenianiem |
| Definicja roli lidera | „Robię wszystko najlepiej" | „Tworzę warunki dla zespołu" |

---

## Mocne strony klienta

- Wysoka refleksyjność i gotowość do wglądu
- Odwaga w konfrontowaniu się z własnymi wzorcami
- Zdolność do utrzymania zmiany pod presją

---

## Obszary do dalszej pracy

1. **Odpowiedź na własny błąd** – czy nowa tożsamość lidera jest stabilna, gdy to Marek się pomyli?
2. **Skalowanie podejścia** – jak rozszerzyć nowy styl na cały zespół?

---

## Pytania do refleksji na dalszy proces

- Co pozwoli Markowi utrzymać nową definicję roli długoterminowo?
- Jak wygląda „lider" w rozumieniu Marka za rok?
- Co chce teraz rozwijać jako coach swojego własnego rozwoju?

---

*Retrospektywa wygenerowana przez Coach Hub – Mentor AI.*
`,
    },
  });

  // Demo chat thread dla Marka
  const thread1 = await prisma.chatThread.create({
    data: { clientId: klient1.id },
  });

  const chatMessages1 = [
    {
      role: "user",
      contentMd: "Ogólna refleksja",
    },
    {
      role: "assistant",
      contentMd: `### Pytania, które możesz zadać Markowi

- Co dla Ciebie oznacza dziś „bycie dobrym liderem" – jak to definiujesz po czterech sesjach?
- W których sytuacjach nowe przekonania działają najłatwiej, a gdzie wciąż czujesz opór?
- Co zrobiłeś ostatnio jako lider, z czego jesteś naprawdę zadowolony – i dlaczego?

### Możliwe kierunki / interwencje

1. **Praca nad odpornością na błąd** – Marek sprawdził nową tożsamość w sytuacji sukcesu (kryzys z klientem). Warto zbadać, co dzieje się, gdy to on popełni błąd. Ćwiczenie: symulacja trudnej rozmowy feedbackowej z coachem jako obserwatorem.
2. **Zakotwiczenie zmiany** – refleksja pisemna „Czego nauczyłem się o sobie jako liderze" może stać się dokumentem referencyjnym na trudne chwile. Warto ją sfinalizować i przejrzeć razem.
3. **Rozmowa o zakończeniu procesu** – 4 sesje, wyraźna zmiana. Czy Marek czuje gotowość do samodzielności? Co byłoby dla niego wystarczającym „zamknięciem"?

### Ryzyka / aspekty etyczne

Uważaj na idealizację zmiany – Marek może wyolbrzymiać postęp w kontekście jednego kryzysu. Warto weryfikować, czy zmiana jest trwała, nie jednorazowa.

### Proponowany następny krok

Zaplanuj sesję zamykającą lub „checkpoint" – poproś Marka, by przed sesją napisał własną retrospektywę procesu. Porównajcie ją z Twoją perspektywą coacha.`,
    },
    {
      role: "user",
      contentMd: "Martwię się, że Marek jest teraz zbyt pewny siebie. Jak to sprawdzić?",
    },
    {
      role: "assistant",
      contentMd: `To ważna obserwacja – warto ją zbadać, zanim stanie się ślepą plamą.

### Pytania doprecyzowujące

Zanim odpowiem, chciałbym zrozumieć więcej:

1. Co konkretnie obserwujesz – co Marek mówi lub robi, co czytasz jako „zbyt pewny siebie"?
2. Czy masz poczucie, że ta pewność siebie zastępuje refleksję, czy raczej jej towarzyszy?
3. Jak Marek reaguje na pytania kwestionujące jego nowe podejście – otwiera się czy broni?

### Możliwe kierunki

- **Sprawdzenie elastyczności** – zadaj pytanie: „Co byś zrobił, gdyby delegowanie znów nie zadziałało?" Obserwuj, czy Marek potrafi myśleć scenariuszowo, czy odpowiada schematycznie.
- **Konfrontacja z kontrprzykładem** – zapytaj o sytuację, gdzie nowy styl pracy nie przyniósł efektu. Jeśli Marek nie może jej wskazać, może to sygnał selektywnej pamięci.

### Aspekty etyczne

Twoja rola jako coacha to m.in. utrzymanie przestrzeni na trudne pytania, nawet gdy klient czuje się dobrze. Pewność siebie po procesie jest pozytywna – ale zadaniem superwizji jest właśnie sprawdzenie jej jakości.`,
    },
  ];

  for (const msg of chatMessages1) {
    await prisma.chatMessage.create({
      data: {
        threadId: thread1.id,
        role: msg.role,
        contentMd: msg.contentMd,
      },
    });
  }

  // ── Klient 2: Katarzyna Wiśniewska ───────────────────────────────────────

  const klient2 = await prisma.client.create({
    data: {
      userId: user.id,
      name: "Katarzyna Wiśniewska",
      company: "Kreatywna Agencja Brand Studio",
      role: "Dyrektor Kreatywny",
      stage: "Wstęp",
      generalNote:
        "Kasia właśnie awansowała na stanowisko dyrektora kreatywnego. Zmaga się z syndromem oszusta i trudnościami w zarządzaniu swoim dawnym zespołem.",
    },
  });

  await prisma.session.create({
    data: {
      clientId: klient2.id,
      scheduledAt: new Date("2024-12-10T14:00:00"),
      durationMin: 50,
      status: "Odbyta",
      notesMd: `## Kontrakt / cel sesji

Pierwsza sesja – zawarcie kontraktu coachingowego. Kasia chce przepracować temat pewności siebie w nowej roli. Czuje, że „nie zasługuje" na to stanowisko i boi się, że zespół to w końcu odkryje.

---

## Co powiedział klient (transkrypcja / cytaty)

„Dostałam tę pracę, ale cały czas myślę, że to pomyłka. Że zaraz ktoś przyjdzie i powie, że jednak się nie nadaję."

„W poprzedniej roli wiedziałam co robię. Teraz muszę podejmować decyzje, których nie mogę cofnąć i to mnie paraliżuje."

„Mój zespół patrzy na mnie jak na szefową, ale ja czuję się jakbym się przebierała za szefową."

---

## Obserwacje coacha

Kasia jest bardzo artykułowana i refleksyjna. Mówiła płynnie, ale z wyraźnym napięciem. Kiedy opisywała swój strach, kilka razy używała słowa „odkryją" – jakby prawda o jej rzekomej niekompetencji była faktem do odkrycia, nie przekonaniem do zbadania.

---

## Hipotezy

1. Klasyczny syndrom oszusta – wzmocniony przez nagłą zmianę roli.
2. Kasia może definiować swoją wartość przez wykonywanie zadań, nie przez przywództwo.
3. Zarządzanie dawnym zespołem to dodatkowe wyzwanie – zmiana relacji z kolegów na przełożony/podwładny.

---

## Ustalenia / działania

- Kasia zapisze 3 sukcesy z ostatnich 6 miesięcy, które uważa za „naprawdę swoje".
- Na kolejnej sesji omówimy, co sprawiło, że dostała awans – z perspektywy faktów, nie przekonań.
- Ustalony cel coachingowy: zbudowanie stabilnego poczucia własnej wartości w roli lidera.
`,
    },
  });

  console.log("✅ Seed zakończony pomyślnie.");
  console.log("   Użytkownik: coach@example.com / coach123");
  console.log("   Klienci: Marek Nowak (4 sesje, demo chat), Katarzyna Wiśniewska (1 sesja)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
