#!/usr/bin/env python3
"""
Generate literary profiles for the LIRA book dataset.

Input:
    Carti.xlsx

Outputs:
    books.json
    book_profile_diagnostics.json

The script uses a multilingual SentenceTransformer model and compares each
book embedding against positive/negative semantic anchors for the 10 LIRA
dimensions.

The normalization is intentionally a first-pass calibration. The diagnostic
file keeps raw similarities so the distributions can be inspected before
locking the final calibration strategy.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer

import torch

MODEL_NAME = "intfloat/multilingual-e5-large"


def resolve_device(requested: str) -> str:
    """Resolve the requested device, with a safe CUDA fallback."""
    if requested == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"

    if requested == "cuda":
        if not torch.cuda.is_available():
            raise RuntimeError(
                "CUDA was requested, but torch.cuda.is_available() is False. "
                "Use --device cpu or --device auto."
            )
        return "cuda"

    return "cpu"


def stable_hash(*parts: str) -> str:
    """Create a deterministic cache key from text/model inputs."""
    h = hashlib.sha256()
    for part in parts:
        encoded = part.encode("utf-8")
        h.update(len(encoded).to_bytes(8, "little"))
        h.update(encoded)
    return h.hexdigest()[:16]

AXIS_ANCHORS: dict[str, dict[str, str]] = {
    "curiosity": {
        "positive": (
            "Text literar orientat spre explorare, descoperire și întâlnirea cu "
            "lucruri necunoscute. Narațiunea stimulează dorința de a afla, de a "
            "investiga și de a înțelege ceva nou, fie că este vorba despre lumi "
            "necunoscute, idei, mistere, fenomene, locuri sau perspective diferite. "
            "Sunt importante căutarea adevărului, întrebările, investigația, "
            "călătoria, aventura intelectuală și descoperirea unor informații "
            "sau experiențe noi."
        ),
        "negative": (
            "Text literar concentrat pe familiaritate, rutină și experiențe "
            "cotidiene deja cunoscute. Narațiunea se desfășoară în contexte "
            "obișnuite și stabile, fără o preocupare puternică pentru explorarea "
            "necunoscutului, descoperirea unor idei noi sau investigarea unor "
            "mistere. Accentul cade pe experiențe familiare, relații și situații "
            "convenționale mai degrabă decât pe explorare și descoperire."
        ),
    },
    "reflection": {
        "positive": (
            "Text literar care încurajează introspecția, contemplarea și gândirea "
            "profundă asupra experienței umane. Explorează conștiința, identitatea, "
            "existența, sensul vieții, dilemele morale, memoria, valorile și "
            "conflictele interioare. Acordă importanță proceselor de gândire și "
            "analizei psihologice și invită cititorul să reflecteze asupra ideilor "
            "și experiențelor prezentate."
        ),
        "negative": (
            "Text literar orientat predominant spre acțiune, evenimente și "
            "desfășurarea externă a poveștii. Accentul cade pe ceea ce se întâmplă, "
            "pe conflicte, aventuri, mișcare și reacții rapide, fără o preocupare "
            "semnificativă pentru introspecție, filosofie sau analiza vieții "
            "interioare. Experiența este construită mai mult prin evenimente "
            "decât prin contemplare și gândire."
        ),
    },
    "complexity": {
        "positive": (
            "Text literar cu o construcție narativă sau tematică densă și "
            "stratificată, în care înțelegerea operei presupune conectarea mai "
            "multor elemente între ele. Poate include fire narative multiple, "
            "perspective schimbate, structuri temporale neobișnuite, relații "
            "complexe între personaje și evenimente, teme care se dezvoltă "
            "simultan, simboluri, subtexte sau idei aflate în relație unele cu "
            "altele. Sensul și construcția operei devin mai clare pe măsură ce "
            "cititorul corelează aceste niveluri."
        ),
        "negative": (
            "Text literar cu o construcție narativă sau tematică predominant simplă "
            "și directă, în care principalele personaje, evenimente și idei pot fi "
            "urmărite fără a fi necesară corelarea mai multor niveluri independente. "
            "Intriga este în general liniară, perspectivele și relațiile dintre "
            "evenimente sunt clare, iar temele principale sunt prezentate direct. "
            "Înțelegerea operei depinde în mică măsură de identificarea unor "
            "structuri, conexiuni sau subtexte suplimentare."
        ),
    },
    "emotionality": {
        "positive": (
            "Text literar în care experiența emoțională a personajelor este una dintre "
            "componentele centrale ale operei. Sentimentele puternice, relațiile afective, "
            "iubirea, pierderea, dorul, vinovăția, frica, trauma, suferința, atașamentul "
            "sau conflictele emoționale influențează în mod semnificativ acțiunile, "
            "deciziile și evoluția personajelor. Reacțiile și transformările emoționale "
            "sunt urmărite în profunzime, iar înțelegerea personajelor și a conflictului "
            "depinde în mare măsură de ceea ce simt și de felul în care relațiile lor "
            "afective se schimbă pe parcursul operei."
        ),
        "negative": (
            "Text literar în care experiența emoțională este secundară față de acțiune, "
            "aventură, investigație, explorare, rezolvarea unor probleme, idei sau "
            "construcția lumii. Personajele pot avea sentimente și pot trece prin situații "
            "intense, însă emoțiile lor nu reprezintă principalul mecanism prin care "
            "evoluează povestea. Relațiile afective și reacțiile emoționale sunt prezentate "
            "mai degrabă ca elemente secundare, în timp ce interesul principal al operei "
            "provine din evenimente, concepte, mister, strategie, supraviețuire sau "
            "explorarea unei lumi."
        ),
    },
    "characters": {
        "positive": (
            "Text literar în care personajele reprezintă un element central al "
            "experienței de lectură. Narațiunea acordă multă atenție personalității, "
            "motivațiilor, psihologiei, relațiilor și evoluției personajelor. Sunt "
            "importante conflictele interioare, relațiile de familie sau de prietenie, "
            "transformarea personală, portretul psihologic și modul în care "
            "personajele se influențează reciproc."
        ),
        "negative": (
            "Text literar în care accentul principal cade pe evenimente, acțiune, "
            "aventură, explorarea lumii, intrigă sau desfășurarea unor situații, "
            "iar personajele sunt mai puțin aprofundate. Personajele pot avea un "
            "rol important în poveste, dar dezvoltarea lor psihologică, relațiile "
            "și transformările personale nu reprezintă centrul narațiunii."
        ),
    },
    "pace": {
        "positive": (
            "Text literar cu un ritm narativ rapid și dinamic, în care evenimentele "
            "se succed frecvent și povestea avansează constant. Poate include "
            "acțiune, suspans, tensiune, urmăriri, confruntări, schimbări rapide, "
            "urgență și evenimente succesive. Narațiunea oferă puține momente de "
            "stagnare și menține o senzație de mișcare și progres continuu."
        ),
        "negative": (
            "Text literar cu un ritm narativ lent și gradual, care acordă timp "
            "descrierii, atmosferei, contemplării și dezvoltării treptate a "
            "personajelor sau situațiilor. Evenimentele se desfășoară fără grabă, "
            "iar narațiunea poate conține scene extinse, momente de observație, "
            "reflecție și tranziții calme. Accentul cade pe proces și atmosferă "
            "mai mult decât pe succesiunea rapidă a evenimentelor."
        ),
    },
    "imagination": {
        "positive": (
            "Text literar care depășește realitatea obișnuită prin utilizarea "
            "imaginației, fantasticului sau a elementelor speculative. Poate "
            "prezenta magie, lumi imaginare, lumi alternative, creaturi fantastice, "
            "mitologie, supranatural, vise, basme, realități distorsionate sau "
            "concepte imposibile în lumea reală. Universul narativ poate funcționa "
            "după reguli diferite de cele ale realității cotidiene."
        ),
        "negative": (
            "Text literar puternic ancorat în lumea obișnuită și în experiențe "
            "recognoscibile, fără utilizarea semnificativă a fantasticului, magiei "
            "sau supranaturalului. Evenimentele, personajele și locurile aparțin "
            "unei lumi concrete și familiare, iar situațiile prezentate sunt "
            "plauzibile în cadrul realității cotidiene."
        ),
    },
    "realism": {
        "positive": (
            "Text literar care reprezintă lumea, oamenii și experiențele umane "
            "într-un mod credibil și apropiat de realitate. Narațiunea poate aborda "
            "viața cotidiană, familia, comunitatea, societatea, relațiile dintre "
            "oameni, probleme sociale sau contexte istorice recognoscibile. "
            "Comportamentul personajelor și evenimentele prezentate sunt plauzibile "
            "și se bazează pe experiențe care pot exista în lumea reală."
        ),
        "negative": (
            "Text literar în care lumea narativă se îndepărtează semnificativ de "
            "realitatea obișnuită sau în care evenimentele și experiențele sunt "
            "construite în jurul fantasticului, supranaturalului, magiei, "
            "mitologiei, lumilor imaginare, realităților alternative sau situațiilor "
            "imposibile. Logica universului poate diferi de regulile lumii reale."
        ),
    },
    "ambiguity": {
        "positive": (
            "Text literar cu un sens interpretativ deschis, în care autorul nu "
            "stabilește complet o singură semnificație pentru personaje, evenimente, "
            "simboluri sau idei. Textul poate susține simultan mai multe interpretări "
            "plauzibile, iar intențiile, motivațiile, adevărul unei perspective sau "
            "semnificația unor elemente pot rămâne deliberat neclare. Cititorul trebuie "
            "să interpreteze indicii, contradicții, simboluri și subtexte și poate ajunge "
            "la concluzii diferite fără ca una dintre ele să fie confirmată definitiv "
            "de narațiune."
        ),
        "negative": (
            "Text literar cu un sens predominant determinat, în care narațiunea oferă "
            "suficiente informații pentru ca semnificația principală a personajelor, "
            "evenimentelor și ideilor să poată fi stabilită fără interpretări "
            "fundamental diferite. Misterele, conflictele și întrebările ridicate de "
            "poveste pot crea suspans sau curiozitate, dar sunt în general clarificate "
            "prin informațiile oferite de text. Simbolurile și elementele tematice "
            "susțin în principal o interpretare recognoscibilă, iar cititorul nu trebuie "
            "să aleagă între mai multe sensuri incompatibile."
        ),
    },
    "culture": {
        "positive": (
            "Literatură în care cultura unei comunități, societăți sau civilizații "
            "este o componentă importantă a experienței narative. Identitatea culturală, "
            "tradițiile, obiceiurile, valorile colective, credințele, religia, mitologia, "
            "normele sociale, memoria colectivă, structurile comunității sau conflictele "
            "dintre grupuri culturale influențează în mod direct personajele, relațiile, "
            "conflictele și sensul operei. Contextul cultural și social nu reprezintă "
            "doar decorul poveștii, ci este necesar pentru înțelegerea profundă a "
            "lumii literare și a experienței personajelor."
        ),
        "negative": (
            "Literatură în care experiența narativă poate fi înțeleasă în mare parte "
            "fără cunoașterea unei culturi, societăți sau perioade istorice specifice. "
            "Accentul principal cade pe aventură, acțiune, supraviețuire, investigație, "
            "rezolvarea unor probleme, explorarea unei lumi sau pe experiențe individuale "
            "care nu depind în mod semnificativ de tradiții, valori, credințe, norme "
            "sociale sau identitate culturală specifice. Pot exista elemente culturale "
            "sau istorice în text, dar acestea au un rol secundar și nu sunt esențiale "
            "pentru înțelegerea conflictului sau a sensului principal al operei."
        ),
    },
}

BOOK_COLUMNS = {
    "title": "Titlu",
    "author": "Autor",
    "genres": "Genuri",
    "language": "Limba originală",
    "year": "An publicare",
    "themes": "Teme",
    "setting": "Decor",
    "characters": "Personaje",
    "atmosphere": "Atmosferă",
    "elements": "Elemente",
    "score": "Scor",
}


def clean_value(value: Any) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def build_book_text(row: pd.Series) -> str:
    """
    Build the semantic representation used for the book embedding.

    Metadata such as original language, publication year and dataset score are
    intentionally excluded because they are not literary dimensions.
    """
    fields = [
        ("Titlu", row[BOOK_COLUMNS["title"]]),
        ("Autor", row[BOOK_COLUMNS["author"]]),
        ("Genuri", row[BOOK_COLUMNS["genres"]]),
        ("Teme", row[BOOK_COLUMNS["themes"]]),
        ("Decor", row[BOOK_COLUMNS["setting"]]),
        ("Personaje", row[BOOK_COLUMNS["characters"]]),
        ("Atmosferă", row[BOOK_COLUMNS["atmosphere"]]),
        ("Elemente", row[BOOK_COLUMNS["elements"]]),
    ]

    return "\n".join(
        f"{label}: {clean_value(value)}"
        for label, value in fields
        if clean_value(value)
    )


def make_id(title: str, author: str) -> str:
    """
    Deterministic ID based on title + author.

    Unicode is retained; only whitespace and separators are normalized.
    """
    import re
    import unicodedata

    value = f"{title}-{author}".strip().lower()
    value = unicodedata.normalize("NFKC", value)
    value = re.sub(r"\s+", "-", value)
    value = re.sub(r"[^\w\-]+", "", value, flags=re.UNICODE)
    value = re.sub(r"-+", "-", value).strip("-")
    return value


def encode_texts(
    model: SentenceTransformer,
    texts: list[str],
    *,
    prefix: str,
    batch_size: int,
    show_progress_bar: bool = True,
) -> np.ndarray:
    """
    Encode texts with E5 prefixes and configurable batching.

    Book metadata is encoded as passages; semantic anchors are encoded as
    queries. Embeddings are normalized once here, so cosine similarity can
    later be calculated with a matrix multiplication.
    """
    return model.encode(
        [f"{prefix}: {text}" for text in texts],
        normalize_embeddings=True,
        show_progress_bar=show_progress_bar,
        batch_size=batch_size,
        convert_to_numpy=True,
    )


def load_or_encode_cache(
    *,
    model: SentenceTransformer,
    texts: list[str],
    prefix: str,
    cache_path: Path,
    cache_key: str,
    batch_size: int,
    show_progress_bar: bool,
) -> np.ndarray:
    """
    Load embeddings from cache when the cache key matches; otherwise encode
    and save them.

    The key includes the model name and the exact input texts, so changing
    Carti.xlsx content, semantic anchors, or the model automatically creates
    a new cache entry instead of reusing stale embeddings.
    """
    metadata_path = cache_path.with_suffix(".json")

    if cache_path.exists() and metadata_path.exists():
        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            if metadata.get("cache_key") == cache_key:
                embeddings = np.load(cache_path)
                print(f"Loading cached embeddings: {cache_path}")
                return embeddings
        except (OSError, ValueError, KeyError):
            pass

    print(f"Generating embeddings: {cache_path}")
    embeddings = encode_texts(
        model,
        texts,
        prefix=prefix,
        batch_size=batch_size,
        show_progress_bar=show_progress_bar,
    )

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    np.save(cache_path, embeddings)
    metadata_path.write_text(
        json.dumps(
            {
                "cache_key": cache_key,
                "model": cache_key.split(":")[0],
                "prefix": prefix,
                "count": len(texts),
                "dimension": int(embeddings.shape[1]),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return embeddings


def calculate_raw_scores(
    book_embeddings: np.ndarray,
    positive_embeddings: np.ndarray,
    negative_embeddings: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Returns:
        positive similarities
        negative similarities
        raw = positive - negative
    """
    positive = book_embeddings @ positive_embeddings.T
    negative = book_embeddings @ negative_embeddings.T
    raw = positive - negative
    return positive, negative, raw


def first_pass_normalize(raw_scores: np.ndarray) -> np.ndarray:
    """
    Provisional symmetric robust normalization.

    The 5th and 95th percentiles define the useful observed range for each
    dimension. This is deliberately a first-pass calibration and should be
    reviewed using the diagnostic output.
    """
    result = np.zeros_like(raw_scores, dtype=float)

    for j in range(raw_scores.shape[1]):
        values = raw_scores[:, j]
        low = float(np.percentile(values, 5))
        high = float(np.percentile(values, 95))
        scale = max(abs(low), abs(high), 1e-8)
        result[:, j] = np.clip(values / scale, -1.0, 1.0)

    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("Carti.xlsx"),
        help="Path to the source Excel file.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("books_large_3.json"),
        help="Path for the generated books JSON.",
    )
    parser.add_argument(
        "--diagnostics",
        type=Path,
        default=Path("book_profile_diagnostics_large_3.json"),
        help="Path for raw similarity/calibration diagnostics.",
    )
    parser.add_argument(
        "--model",
        default=MODEL_NAME,
        help="SentenceTransformer model name.",
    )
    parser.add_argument(
        "--device",
        choices=("auto", "cuda", "cpu"),
        default="auto",
        help="Embedding device. 'auto' uses CUDA when available.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Batch size for SentenceTransformer encoding.",
    )
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=Path(".embedding_cache"),
        help="Directory used to cache book and anchor embeddings.",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Ignore existing embedding caches and regenerate them.",
    )
    args = parser.parse_args()

    if args.batch_size < 1:
        raise ValueError("--batch-size must be >= 1")

    device = resolve_device(args.device)
    print(f"Using device: {device}")
    if device == "cuda":
        print(f"CUDA device: {torch.cuda.get_device_name(0)}")

    if not args.input.exists():
        raise FileNotFoundError(f"Input file not found: {args.input}")

    df = pd.read_excel(args.input)

    missing_columns = [
        column for column in BOOK_COLUMNS.values()
        if column not in df.columns
    ]
    if missing_columns:
        raise ValueError(
            "Missing expected Excel columns: "
            + ", ".join(missing_columns)
        )

    print(f"Loaded {len(df)} books from {args.input}")
    print(f"Loading embedding model: {args.model}")
    model = SentenceTransformer(args.model, device=device)

    book_texts = [build_book_text(row) for _, row in df.iterrows()]

    axis_names = list(AXIS_ANCHORS.keys())
    positive_texts = [AXIS_ANCHORS[a]["positive"] for a in axis_names]
    negative_texts = [AXIS_ANCHORS[a]["negative"] for a in axis_names]

    # ------------------------------------------------------------------
    # Embedding cache
    #
    # Book embeddings depend on:
    #   - model
    #   - exact book texts generated from Carti.xlsx
    #
    # Anchor embeddings depend on:
    #   - model
    #   - exact positive/negative semantic paragraphs
    #
    # Therefore, changing an axis paragraph only invalidates the anchor
    # cache; the 421 book embeddings can be reused.
    # ------------------------------------------------------------------
    args.cache_dir.mkdir(parents=True, exist_ok=True)

    model_key = args.model
    books_key = stable_hash(model_key, "passage", *book_texts)
    positive_key = stable_hash(
        model_key,
        "query",
        "positive",
        *positive_texts,
    )
    negative_key = stable_hash(
        model_key,
        "query",
        "negative",
        *negative_texts,
    )

    book_cache = args.cache_dir / f"books_{books_key}.npy"
    positive_cache = args.cache_dir / f"anchors_positive_{positive_key}.npy"
    negative_cache = args.cache_dir / f"anchors_negative_{negative_key}.npy"

    if args.no_cache:
        for cache_path in (book_cache, positive_cache, negative_cache):
            metadata_path = cache_path.with_suffix(".json")
            cache_path.unlink(missing_ok=True)
            metadata_path.unlink(missing_ok=True)

    print("Loading/generating book embeddings...")
    book_embeddings = load_or_encode_cache(
        model=model,
        texts=book_texts,
        prefix="passage",
        cache_path=book_cache,
        cache_key=f"{model_key}:{books_key}",
        batch_size=args.batch_size,
        show_progress_bar=True,
    )

    print("Loading/generating positive anchor embeddings...")
    positive_embeddings = load_or_encode_cache(
        model=model,
        texts=positive_texts,
        prefix="query",
        cache_path=positive_cache,
        cache_key=f"{model_key}:{positive_key}",
        batch_size=args.batch_size,
        show_progress_bar=False,
    )

    print("Loading/generating negative anchor embeddings...")
    negative_embeddings = load_or_encode_cache(
        model=model,
        texts=negative_texts,
        prefix="query",
        cache_path=negative_cache,
        cache_key=f"{model_key}:{negative_key}",
        batch_size=args.batch_size,
        show_progress_bar=False,
    )

    positive, negative, raw = calculate_raw_scores(
        book_embeddings,
        positive_embeddings,
        negative_embeddings,
    )

    normalized = first_pass_normalize(raw)

    books = []
    diagnostics = []

    for i, (_, row) in enumerate(df.iterrows()):
        title = clean_value(row[BOOK_COLUMNS["title"]])
        author = clean_value(row[BOOK_COLUMNS["author"]])
        book_id = make_id(title, author)

        dimensions = {
            axis: round(float(normalized[i, j]), 6)
            for j, axis in enumerate(axis_names)
        }

        books.append(
            {
                "id": book_id,
                "title": title,
                "author": author,
                "dimensions": dimensions,
                "score": int(row[BOOK_COLUMNS["score"]]),
            }
        )

        diagnostics.append(
            {
                "id": book_id,
                "title": title,
                "author": author,
                "raw": {
                    axis: round(float(raw[i, j]), 6)
                    for j, axis in enumerate(axis_names)
                },
                "positive_similarity": {
                    axis: round(float(positive[i, j]), 6)
                    for j, axis in enumerate(axis_names)
                },
                "negative_similarity": {
                    axis: round(float(negative[i, j]), 6)
                    for j, axis in enumerate(axis_names)
                },
                "normalized": dimensions,
            }
        )

    args.output.write_text(
        json.dumps(books, ensure_ascii=False, indent=4),
        encoding="utf-8",
    )

    diagnostic_payload = {
        "model": args.model,
        "book_count": len(books),
        "axes": axis_names,
        "normalization": {
            "method": "symmetric_5th_95th_percentile_first_pass",
            "range": [-1.0, 1.0],
            "note": (
                "Provisional calibration. Review distributions before "
                "treating normalized values as final."
            ),
        },
        "books": diagnostics,
    }

    args.diagnostics.write_text(
        json.dumps(diagnostic_payload, ensure_ascii=False, indent=4),
        encoding="utf-8",
    )

    print(f"Generated {args.output}")
    print(f"Generated diagnostics: {args.diagnostics}")
    print(f"Embedding cache: {args.cache_dir}")


if __name__ == "__main__":
    main()