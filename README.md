# LIRA — Aplicație de recomandare de cărți

LIRA este o aplicație de recomandare personalizată de cărți. Utilizatorul completează un chestionar de personalitate, iar răspunsurile sunt procesate pentru a genera un profil literar și, ulterior, recomandări de cărți.

## Structura proiectului

```text
LIRA/
├── book-recommender-backend/
│   └── FastAPI
│
├── book-recommender-frontend/
│   └── React + Vite
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

# 3. Frontend — React + Vite

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
.env
```

și adaugă:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Acest fișier nu trebuie inclus în Git dacă este configurat ca fișier local/development.

Pentru repository poate exista un:

```text
.env.example
```

cu:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

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

Vite va afișa adresa aplicației, de obicei:

```text
http://localhost:5173
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
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── ...
│
├── .env
├── package.json
├── vite.config.ts
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
book-recommender-frontend/.env
```

să conțină:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Verifică și că backend-ul rulează la:

```text
http://127.0.0.1:8000
```

După modificarea `.env`, repornește Vite:

```bash
CTRL + C
npm run dev
```

---

## Eroare CORS

Backend-ul trebuie să permită origin-ul frontend-ului:

```text
http://localhost:5173
```

În `app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Dacă Vite rulează pe un alt port, origin-ul trebuie actualizat corespunzător.

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

* frontend-ul Vite reîncarcă automat aplicația;
* FastAPI cu `--reload` repornește automat serverul după modificările backend.

Pentru instalarea unei noi dependințe Python, actualizați `requirements.txt`.

Pentru instalarea unei noi dependințe frontend, actualizați automat `package.json` și `package-lock.json` prin `npm install <package>`.
