"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import PageLayout from "@/components/ui/PageLayout/PageLayout";
import Button from "@/components/ui/Button/Button";

import participationService from "@/services/participationService";
import { useSession } from "@/lib/session";


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
        <section className="flex min-h-[70vh] items-center justify-center px-6 py-16 text-center">

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
      <section className="flex min-h-[70vh] items-center justify-center px-6 py-16">
        <div className="w-full max-w-[560px] text-center">

          <p className="mb-3 text-[0.85rem] font-semibold uppercase tracking-[0.12em] opacity-65">Rezultatele tale</p>

          <h1 className="text-[clamp(2.2rem,6vw,4rem)] leading-[1.05]">Primește rezultatele pe email</h1>

          <p className="mx-auto mt-6 mb-10 max-w-[480px] leading-[1.7] opacity-70">
            Îți vom trimite profilul tău literar și cărțile pe care LIRA ți le
            recomandă.
          </p>

          <form className="flex flex-col gap-6 text-left" onSubmit={handleSubmit}>

            <div className="flex flex-col gap-2">

              <label htmlFor="email" className="text-[0.9rem] font-semibold">Adresa de email</label>

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
                className="w-full rounded-[10px] border border-field bg-transparent px-4 py-3.5 focus:border-current focus:outline-none"
              />

              {error && <p className="text-[0.85rem] opacity-80">{error}</p>}

            </div>

            <label className="flex cursor-pointer items-start gap-3 text-[0.9rem] leading-[1.5] opacity-75">

              <input
                type="checkbox"
                checked={newsletter}
                onChange={(event) => setNewsletter(event.target.checked)}
                className="mt-1 shrink-0"
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
