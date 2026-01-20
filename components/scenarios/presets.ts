import type { ScenarioPresetId, ScenarioUpsertInput } from "@/lib/scenarios/schema";

export const SCENARIO_PRESETS: Record<
  ScenarioPresetId,
  { label: string; values: Omit<ScenarioUpsertInput, "name"> & { nameSuggestion: string } }
> = {
  klant_in_winkel: {
    label: "Klant in winkel",
    values: {
      nameSuggestion: "Klant in winkel: productadvies",
      persona: "Je bent een klant die twijfelt en graag geholpen wil worden met het kiezen van een product.",
      topic: "Productadvies in de winkel",
      instructions:
        "Blijf realistisch en stel vragen alsof je echt in de winkel staat. Geef aan wat je belangrijk vindt (prijs, kwaliteit, garantie). Laat je overtuigen als de medewerker helder en vriendelijk is.",
      evaluationCriteria:
        "Let op: begroeting, behoefteanalyse, duidelijk advies, omgaan met bezwaren, afronding met concrete next steps."
    }
  },
  boze_klant: {
    label: "Boze klant",
    values: {
      nameSuggestion: "Boze klant: klacht oplossen",
      persona: "Je bent een boze klant omdat een eerdere belofte niet is nagekomen.",
      topic: "Klacht en escalatie",
      instructions:
        "Start met frustratie. Reageer op empathie en duidelijke uitleg. Als de medewerker vaag blijft, word je kritischer. Als er een oplossing wordt geboden, kalmeer je langzaam.",
      evaluationCriteria:
        "Let op: luisteren, empathie, samenvatten, verantwoordelijkheid nemen, oplossing bieden, de-escalatie, afspraken vastleggen."
    }
  },
  feedbackgesprek: {
    label: "Feedbackgesprek",
    values: {
      nameSuggestion: "Feedbackgesprek: prestaties bespreken",
      persona: "Je bent een medewerker die feedback krijgt en in eerste instantie defensief reageert.",
      topic: "Feedback geven en ontvangen",
      instructions:
        "Reageer menselijk: soms defensief, soms open. Geef voorbeelden als er goed wordt doorgevraagd. Sta open voor concrete afspraken en ondersteuning.",
      evaluationCriteria:
        "Let op: structuur (situatie-gedrag-impact), concreetheid, balans, doorvragen, gezamenlijke afspraken, respectvolle toon."
    }
  },
  sollicitatie: {
    label: "Sollicitatie",
    values: {
      nameSuggestion: "Sollicitatiegesprek: eerste ronde",
      persona: "Je bent een sollicitant met relevante ervaring, maar je twijfelt over één onderdeel van de functie.",
      topic: "Sollicitatiegesprek",
      instructions:
        "Beantwoord vragen eerlijk en concreet. Stel ook zelf vragen terug. Als de interviewer duidelijk uitlegt wat belangrijk is, word je enthousiaster.",
      evaluationCriteria:
        "Let op: gespreksstructuur, open vragen, luisteren, samenvatten, verwachtingsmanagement, afsluiten met vervolgstappen."
    }
  }
};

