# Dor Cu Drumul Plan

Aplicație web de planificare a călătoriilor, cu interfața în limba română și un design gândit în primul rând pentru telefon.

## Funcționalități

- **Autentificare** cu email și parolă. Fiecare utilizator își vede doar călătoriile lui (politici de acces pe fiecare tabelă).
- **Pagina principală**: călătoriile mele, sub formă de carduri cu destinația, perioada și numărul de zile până la plecare. Călătoriile viitoare sunt separate de cele trecute.
- **Creare călătorie**: nume, dată de început, dată de sfârșit, buget total (EUR).
- **Pagina unei călătorii** are patru taburi:
  1. **Itinerariu** — zilele călătoriei sunt generate automat din datele de început și sfârșit. În fiecare zi poți adăuga activități (oră, titlu, locație, notițe) și le poți reordona.
  2. **Rezervări** — zboruri, cazări și mașină închiriată, cu tip, furnizor, cod de rezervare, dată/oră, preț și link.
  3. **Buget** — cheltuieli pe categorii (transport, cazare, mâncare, activități, altele), total cheltuit comparat cu bugetul, afișat cu o bară de progres.
  4. **Bagaje** — checklist de bagaje și documente: adaugi, bifezi și ștergi obiecte, grupate pe categorii (Documente, Haine, Electronice, Trusă medicală/Cosmetice, plus categorii proprii), cu o bară de progres a pregătirilor.

## Date de test

Fiecare cont nou primește automat o călătorie demo, „Insulele Canare”, cu traseul Malaga → Lanzarote → Tenerife → Cluj (10–18 decembrie 2026), împreună cu câteva activități, rezervări și cheltuieli de exemplu. Călătoria este creată de un trigger la înregistrarea contului, deci apare imediat ce îți faci cont.

## Tehnologii

- TanStack Start (React 19, Vite 7) pentru interfață și rute
- Tailwind CSS 4 pentru stil
- Lovable Cloud (database, auth) pentru backend
- Vitest pentru teste

## Structură

```text
src/
  routes/
    index.tsx              → prima pagină
    auth.tsx               → autentificare
    _authenticated/
      trips.tsx            → lista călătoriilor
      trip.$id.tsx         → pagina unei călătorii (cele patru taburi)
  components/PackingList.tsx → tab-ul Bagaje
  lib/trip-utils.ts        → calculul zilelor, al numărătorii și al progresului
  lib/trips-api.ts         → citiri și scrieri în database
drizzle/                   → schema și migrările bazei de date
```

## Dezvoltare

Ai nevoie de Node.js și npm — [instalează cu nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Comenzi disponibile:

| Comandă | Ce face |
| --- | --- |
| `npm run dev` | pornește aplicația local |
| `npm run build` | construiește varianta de producție |
| `npm run preview` | rulează varianta construită |
| `npm test` | aleargă testele |
| `npm run lint` | verifică codul |
| `npm run format` | formatează codul |

Acest proiect a fost construit cu [Lovable](https://lovable.dev).

**Aplicația live**: https://dor-cu-drumul-plan.lovable.app

## Continuă în Lovable

Poți dezvolta în continuare proiectul în [editorul Lovable](https://lovable.dev/projects/efcddd7c-33c1-4f66-99d8-1651ac9cd48a).

- **Livrează mai repede**: descrii ce vrei și Lovable scrie codul.
- **Rămâi sincronizat**: fiecare modificare făcută în Lovable ajunge direct în acest repository.
- **Păstrezi controlul**: codul e al tău. Îl împingi pe `main` pe GitHub, iar modificările se sincronizează înapoi în Lovable, gata pentru următoarea cerere.
