export interface LiteraryProfile {
    id: string;
    name: string;
    description: string;

    dimensions: {
        curiosity?: number;
        reflection?: number;
        complexity?: number;
        emotionality?: number;
        characters?: number;
        pace?: number;
        imagination?: number;
        realism?: number;
        ambiguity?: number;
        culture?: number;
    };
}

export const LITERARY_PROFILES: LiteraryProfile[] = [

{
    id:"explorer",

    name:"Exploratorul",

    description:
        "Îți place să descoperi idei, lumi și perspective noi.",

    dimensions:{
        curiosity:1,
        imagination:0.8,
        culture:0.7
    }
},

{
    id:"analyst",

    name:"Analistul",

    description:
        "Îți plac cărțile complexe care provoacă reflecția.",

    dimensions:{
        reflection:1,
        complexity:0.9,
        ambiguity:0.5
    }
},

{
    id:"empathetic",

    name:"Empaticul",

    description:
        "Pentru tine personajele și emoțiile sunt sufletul unei cărți.",

    dimensions:{
        emotionality:1,
        characters:0.9
    }
},

{
    id:"adventurer",

    name:"Aventurierul",

    description:
        "Îți place acțiunea și ritmul alert.",

    dimensions:{
        pace:1,
        imagination:0.6
    }
},

{
    id:"realist",

    name:"Realistul",

    description:
        "Preferi poveștile credibile și profund ancorate în realitate.",

    dimensions:{
        realism:1,
        characters:0.7
    }
},

{
    id:"visionary",

    name:"Vizionarul",

    description:
        "Ești atras de concepte originale și de lumi neobișnuite.",

    dimensions:{
        imagination:1,
        curiosity:0.5,
        ambiguity:0.4
    }
}

];