# Dor Cu Drumul Plan

Aplicație web pentru planificarea călătoriilor: itinerarii pe zile, rezervări, buget și lista de bagaje, totul într-un singur loc, optimizat pentru telefon.

**Aplicația live:** https://dor-cu-drumul-plan.lovable.app

## Funcționalități

- **Cont personal** – autentificare cu email și parolă; fiecare utilizator își vede doar propriile călătorii.
- **Călătoriile mele** – carduri cu destinația, perioada și numărul de zile rămase până la plecare, separate în viitoare și trecute.
- **Itinerariu** – zilele călătoriei generate automat; pentru fiecare zi poți adăuga și reordona activități (oră, titlu, locație, notițe).
- **Rezervări** – zboruri, cazări și mașini închiriate, cu furnizor, cod de rezervare, dată, preț și link.
- **Buget** – cheltuieli pe categorii și o bară de progres pentru totalul cheltuit față de buget.
- **Bagaje** – checklist pe categorii (Documente, Haine, Electronice, Trusă medicală/Cosmetice), cu progresul pregătirilor.

## Tehnologii

- React + TypeScript
- Supabase (bază de date și autentificare)
- Construit cu [Lovable](https://lovable.dev)

## Rulare locală

Ai nevoie de Node.js și npm.

```sh
git clone https://github.com/teodoravermesan/dor-cu-drumul-plan.git
cd dor-cu-drumul-plan
npm install
npm run dev
```

## Dezvoltare

Proiectul e sincronizat în ambele sensuri cu Lovable: modificările făcute în editorul Lovable ajung automat aici, iar ce e împins pe `main` ajunge înapoi în Lovable.
