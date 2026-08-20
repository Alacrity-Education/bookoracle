# LIRA — Aplicație de recomandare de cărți

LIRA este o aplicație de recomandare personalizată de cărți. Utilizatorul completează un chestionar de personalitate, iar răspunsurile sunt procesate pentru a genera un profil literar și, ulterior, recomandări de cărți.

## Structura proiectului

```text
LIRA/
├── book-recommender-backend/
│   └── FastAPI
│
├── book-recommender-frontend/
│   └── Next.js (App Router)
│
└── README.md
```

---

# Cerințe

Înainte de pornirea proiectului trebuie instalate:

* Git
* Node.js și npm
* Python 3.11+ recomandat

Verificare:

```bash
git --version
node --version
npm --version
python --version
```

---

# 1. Clonarea repository-ului

```bash
git clone <REPOSITORY_URL>
cd <REPOSITORY>
```

Înlocuiește `<REPOSITORY_URL>` cu URL-ul repository-ului Git.

---

# 2. Backend — FastAPI

Intră în directorul backend:

```bash
cd book-recommender-backend
```

## Crearea mediului virtual

### Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Windows

```powershell
python -m venv .venv
.venv\Scripts\activate
```

După activare, terminalul ar trebui să afișeze ceva de forma:

```text
(.venv)
```

## Instalarea dependințelor

Dacă repository-ul conține `requirements.txt`:

```bash
pip install -r requirements.txt
```

Dacă acesta nu există încă, dependințele pot fi instalate manual:

```bash
pip install fastapi uvicorn
```

---

## Pornirea backend-ului

Din directorul:

```text
book-recommender-backend/
```

rulează:

```bash
uvicorn app.main:app --reload
```

Backend-ul va porni implicit la:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

OpenAPI:

```text
http://127.0.0.1:8000/openapi.json
```

Pentru a opri serverul:

```text
CTRL + C
```

---

# 3. Frontend — Next.js

Deschide un al doilea terminal.

Din directorul root al proiectului:

```bash
cd book-recommender-frontend
```

## Instalarea dependințelor

```bash
npm install
```

---

# 4. Configurarea variabilelor de mediu

În:

```text
book-recommender-frontend/
```

creează fișierul:

```text
.env.local
```

și adaugă:

```env
BACKEND_URL=http://127.0.0.1:8000
```

Acest fișier nu trebuie inclus în Git.

`BACKEND_URL` este citit **doar pe server**, la fiecare cerere. Browserul nu
apelează niciodată FastAPI direct: apelează rutele `/api/*` ale aplicației
Next, care redirecționează cererea către backend. De aceea adresa backend-ului
nu ajunge niciodată în bundle-ul trimis în browser, iar schimbarea ei nu
necesită rebuild.

Pentru repository există un `.env.example` cu aceeași valoare.

---

# 5. Pornirea frontend-ului

Din:

```text
book-recommender-frontend/
```

rulează:

```bash
npm run dev
```

Next va afișa adresa aplicației, de obicei:

```text
http://localhost:3000
```

Deschide adresa afișată în terminal în browser.

---

# 6. Pornirea completă a aplicației

Pentru dezvoltare sunt necesare două terminale.

### Terminal 1 — Backend

```bash
cd book-recommender-backend
```

Activează mediul virtual:

```bash
# Linux / macOS
source .venv/bin/activate
```

sau Windows:

```powershell
.venv\Scripts\activate
```

Apoi:

```bash
uvicorn app.main:app --reload
```

### Terminal 2 — Frontend

```bash
cd book-recommender-frontend
npm run dev
```

---

# 7. Fluxul aplicației

Aplicația funcționează momentan astfel:

```text
Welcome
   ↓
Terms & Conditions
   ↓
GDPR
   ↓
Instruction
   ↓
Questionnaire
   ↓
20 întrebări
   ↓
POST /api/questionnaires/{category}/submit
   ↓
FastAPI
   ↓
Calcularea celor 10 dimensiuni
   ↓
Normalizarea profilului
   ↓
Ranking profiluri literare
   ↓
Results
```

---

# 8. Endpoint-uri disponibile

## Obținerea chestionarului

```http
GET /api/questionnaires/{category}
```

Exemplu:

```http
GET /api/questionnaires/prose
```

## Trimiterea chestionarului

```http
POST /api/questionnaires/{category}/submit
```

Exemplu:

```http
POST /api/questionnaires/prose/submit
```

Body:

```json
{
  "answers": {
    "1": 2,
    "2": -1,
    "3": 1,
    "4": 2
  }
}
```

În versiunea actuală, chestionarul de proză conține 20 de întrebări.

---

# 9. Categorii

În prezent este implementată categoria:

```text
prose
```

Categoria:

```text
poetry
```

este rezervată pentru implementarea ulterioară.

---

# 10. Structura principală a backend-ului

```text
book-recommender-backend/
│
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   └── routes/
│   │       └── questionnaires.py
│   │
│   ├── schemas/
│   │
│   ├── services/
│   │   ├── questionnaire_service.py
│   │   └── personality_service.py
│   │
│   ├── questionnaires/
│   │   └── prose.json
│   │
│   └── profiles/
│       └── literary_profiles.json
│
├── .venv/
├── requirements.txt
└── ...
```

---

# 11. Structura principală a frontend-ului

```text
book-recommender-frontend/
│
├── src/
│   ├── app/            # rute (App Router) + app/api/[...path] (proxy)
│   ├── components/
│   ├── lib/            # backend.ts (server), session.tsx (context)
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── ...
│
├── .env.local
├── package.json
├── next.config.ts
└── ...
```

---

# 12. Probleme frecvente

## Backend-ul nu pornește

Verifică dacă mediul virtual este activ:

```bash
source .venv/bin/activate
```

și dacă dependințele sunt instalate:

```bash
pip install -r requirements.txt
```

Verifică apoi:

```bash
uvicorn app.main:app --reload
```

---

## Frontend-ul nu poate comunica cu backend-ul

Verifică:

```text
book-recommender-frontend/.env.local
```

să conțină:

```env
BACKEND_URL=http://127.0.0.1:8000
```

Verifică și că backend-ul rulează la:

```text
http://127.0.0.1:8000
```

După modificarea `.env.local`, repornește serverul Next:

```bash
CTRL + C
npm run dev
```

Dacă backend-ul nu răspunde, rutele `/api/*` întorc `502` cu
`{"detail": "Backend unavailable."}`, iar pagina chestionarului afișează
„Chestionarul nu este disponibil”.

---

## Eroare CORS

În mod normal nu ar trebui să apară: browserul apelează doar rutele `/api/*`
ale aplicației Next (aceeași origine), iar cererea către FastAPI se face pe
server.

CORS devine relevant doar dacă apelezi API-ul direct din browser. În acest caz
setează variabila de mediu `CORS_ORIGINS` pe backend (implicit
`http://localhost:3000`):

```env
CORS_ORIGINS=http://localhost:3000,https://exemplu.ro
```

---

# 13. Oprirea aplicației

Pentru frontend:

```text
CTRL + C
```

Pentru backend:

```text
CTRL + C
```

Mediul virtual poate fi dezactivat cu:

```bash
deactivate
```

---

# Dezvoltare

Pentru orice modificare în cod:

* frontend-ul Next reîncarcă automat aplicația;
* FastAPI cu `--reload` repornește automat serverul după modificările backend.

Pentru instalarea unei noi dependințe Python, actualizați `requirements.txt`.

Pentru instalarea unei noi dependințe frontend, actualizați automat `package.json` și `package-lock.json` prin `npm install <package>`.
