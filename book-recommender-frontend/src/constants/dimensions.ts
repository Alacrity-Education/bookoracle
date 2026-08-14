export interface PersonalityDimension {
    id: string;
    name: string;
    category:
        | "intellect"
        | "experience"
        | "world"
        | "culture";
    description: string;
    explanation: string;
}

export const DIMENSIONS: PersonalityDimension[] = [
    {
        id: "curiosity",
        name: "Curiozitate intelectuală",
        category: "intellect",
        description:
            "Interes pentru idei noi, cunoaștere și explorare.",
        explanation:
            "Îți place să descoperi perspective noi, contexte istorice și idei originale."
    },

    {
        id: "reflection",
        name: "Reflecție",
        category: "intellect",
        description:
            "Preferință pentru interpretare și analiză.",
        explanation:
            "Apreciezi cărțile care ridică întrebări și te provoacă să reflectezi."
    },

    {
        id: "complexity",
        name: "Complexitate",
        category: "intellect",
        description:
            "Preferință pentru structuri narative complexe.",
        explanation:
            "Te atrag poveștile elaborate, cu mai multe perspective și niveluri de interpretare."
    },

    {
        id: "emotionality",
        name: "Implicare emoțională",
        category: "experience",
        description:
            "Nivelul de conectare emoțională cu povestea.",
        explanation:
            "Pentru tine contează emoțiile, relațiile dintre personaje și impactul lor."
    },

    {
        id: "characters",
        name: "Interes pentru personaje",
        category: "experience",
        description:
            "Importanța dezvoltării personajelor.",
        explanation:
            "Îți place să urmărești evoluția psihologică și motivațiile personajelor."
    },

    {
        id: "pace",
        name: "Ritm narativ",
        category: "experience",
        description:
            "Preferință pentru acțiune și dinamism.",
        explanation:
            "Apreciezi poveștile care evoluează într-un ritm alert și captivant."
    },

    {
        id: "imagination",
        name: "Imaginație",
        category: "world",
        description:
            "Deschidere către lumi fantastice și speculative.",
        explanation:
            "Îți plac universurile originale și poveștile care depășesc limitele realității."
    },

    {
        id: "realism",
        name: "Realism",
        category: "world",
        description:
            "Interes pentru povești apropiate de realitate.",
        explanation:
            "Preferi situațiile credibile, inspirate din viața reală sau din istorie."
    },

    {
        id: "ambiguity",
        name: "Toleranță la ambiguitate",
        category: "world",
        description:
            "Confortul față de finalurile deschise și interpretările multiple.",
        explanation:
            "Nu ai nevoie de toate răspunsurile; îți place să completezi povestea prin propria interpretare."
    },

    {
        id: "culture",
        name: "Deschidere culturală",
        category: "culture",
        description:
            "Interes pentru autori și culturi diverse.",
        explanation:
            "Îți place să descoperi perspective și tradiții literare din întreaga lume."
    }
];