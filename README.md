# Dor Cu Drumul Plan

Construiește o aplicație web de planificare a călătoriilor, cu interfața în limba română.
Funcționalități:
- Autentificare cu email și parolă; fiecare utilizator își vede doar călătoriile lui.
- Pagina principală: lista călătoriilor mele, sub formă de carduri (destinație, perioadă, număr de zile până la plecare). Separă călătoriile viitoare de cele trecute.
- Creare călătorie: nume, dată de început, dată de sfârșit, buget total (EUR).
- Pagina unei călătorii are trei taburi:
  1. Itinerariu: zilele călătoriei generate automat din date; în fiecare zi pot adăuga activități (oră, titlu, locație, notițe) și le pot reordona.
  2. Rezervări: zboruri, cazări, mașină închiriată (tip, furnizor, cod de rezervare, dată/oră, preț, link).
  3. Buget: cheltuieli pe categorii (transport, cazare, mâncare, activități, altele), total cheltuit vs. buget, cu o bară de progres.
- Design curat, modern, optimizat pentru telefon, deoarece o voi folosi mai ales în timpul călătoriei.
Adaugă ca date de test o călătorie cu traseul Malaga → Lanzarote → Tenerife → Cluj.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dor-cu-drumul-plan.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/efcddd7c-33c1-4f66-99d8-1651ac9cd48a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
