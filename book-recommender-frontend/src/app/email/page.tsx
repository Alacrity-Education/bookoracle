"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import PageLayout from "@/components/ui/PageLayout/PageLayout";
import Button from "@/components/ui/Button/Button";

import participationService from "@/services/participationService";
import { useSession } from "@/lib/session";

import "./Email.css";

export default function EmailPage() {
  const router = useRouter();
  const { session, ready } = useSession();

  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!ready) {
    return (
      <PageLayout>
        <p>Se încarcă...</p>
      </PageLayout>
    );
  }

  if (!session) {
    return (
      <PageLayout>
        <section className="email-page email-empty">

          <h1>Rezultatul nu este disponibil</h1>

          <p>Nu am putut încărca datele necesare.</p>

          <Button onClick={() => router.push("/")}>Înapoi la început</Button>

        </section>
      </PageLayout>
    );
  }

  const { result, recommendations, answers, category } = session;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Te rugăm să introduci adresa de email.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("Te rugăm să introduci o adresă de email validă.");
      return;
    }

    if (!trimmedEmail.includes(".")) {
      setError("Te rugăm să introduci o adresă de email validă.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await participationService.complete(category, {
        answers,
        destination: "email",
        email: trimmedEmail,
        newsletter,

        profile: {
          id: result.profiles[0].id,
          name: result.profiles[0].name,
          description: result.profiles[0].description,
        },

        recommendations: recommendations.map((book) => ({
          rank: book.rank,
          book_id: book.book_id,
          title: book.title,
          author: book.author,
        })),
      });

      router.push("/finish");
    } catch (submitError) {
      console.error("Could not save participation:", submitError);

      setError(
        "Nu am putut salva rezultatele. Te rugăm să încerci din nou.",
      );

      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <section className="email-page">
        <div className="email-content">

          <p className="email-eyebrow">Rezultatele tale</p>

          <h1>Primește rezultatele pe email</h1>

          <p className="email-description">
            Îți vom trimite profilul tău literar și cărțile pe care LIRA ți le
            recomandă.
          </p>

          <form className="email-form" onSubmit={handleSubmit}>

            <div className="email-field">

              <label htmlFor="email">Adresa de email</label>

              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="exemplu@email.com"
                autoComplete="email"
              />

              {error && <p className="email-error">{error}</p>}

            </div>

            <label className="newsletter-option">

              <input
                type="checkbox"
                checked={newsletter}
                onChange={(event) => setNewsletter(event.target.checked)}
              />

              <span>
                Vreau să primesc și noutăți și recomandări LIRA pe email.
              </span>

            </label>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Se trimit..." : "Trimite rezultatele"}
            </Button>

          </form>

        </div>
      </section>
    </PageLayout>
  );
}
