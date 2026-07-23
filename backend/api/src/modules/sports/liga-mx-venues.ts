import type { MatchSummary, TeamSummary } from "./sports.types.js";

type Venue = {
  aliases: string[];
  stadium: string;
  city: string;
  latitude: number;
  longitude: number;
};

const venues: Venue[] = [
  {
    aliases: ["america", "club america"],
    stadium: "Estadio Ciudad de los Deportes",
    city: "Ciudad de México",
    latitude: 19.3832,
    longitude: -99.1781,
  },
  {
    aliases: ["atlas"],
    stadium: "Estadio Jalisco",
    city: "Guadalajara",
    latitude: 20.7052,
    longitude: -103.3287,
  },
  {
    aliases: ["atletico san luis", "san luis"],
    stadium: "Estadio Alfonso Lastras",
    city: "San Luis Potosí",
    latitude: 22.138,
    longitude: -100.951,
  },
  {
    aliases: ["cruz azul"],
    stadium: "Estadio Olímpico Universitario",
    city: "Ciudad de México",
    latitude: 19.332,
    longitude: -99.1922,
  },
  {
    aliases: ["guadalajara", "chivas"],
    stadium: "Estadio Akron",
    city: "Zapopan",
    latitude: 20.6818,
    longitude: -103.462,
  },
  {
    aliases: ["juarez", "fc juarez"],
    stadium: "Estadio Olímpico Benito Juárez",
    city: "Ciudad Juárez",
    latitude: 31.7405,
    longitude: -106.4674,
  },
  {
    aliases: ["leon", "club leon"],
    stadium: "Estadio León",
    city: "León",
    latitude: 21.1155,
    longitude: -101.6577,
  },
  {
    aliases: ["mazatlan", "mazatlan fc"],
    stadium: "Estadio El Encanto",
    city: "Mazatlán",
    latitude: 23.2494,
    longitude: -106.411,
  },
  {
    aliases: ["monterrey", "rayados"],
    stadium: "Estadio BBVA",
    city: "Guadalupe",
    latitude: 25.6691,
    longitude: -100.2443,
  },
  {
    aliases: ["necaxa"],
    stadium: "Estadio Victoria",
    city: "Aguascalientes",
    latitude: 21.8807,
    longitude: -102.2758,
  },
  {
    aliases: ["pachuca"],
    stadium: "Estadio Hidalgo",
    city: "Pachuca",
    latitude: 20.1054,
    longitude: -98.7565,
  },
  {
    aliases: ["puebla"],
    stadium: "Estadio Cuauhtémoc",
    city: "Puebla",
    latitude: 19.0781,
    longitude: -98.1648,
  },
  {
    aliases: ["pumas", "pumas unam", "unam"],
    stadium: "Estadio Olímpico Universitario",
    city: "Ciudad de México",
    latitude: 19.332,
    longitude: -99.1922,
  },
  {
    aliases: ["queretaro", "gallos blancos"],
    stadium: "Estadio Corregidora",
    city: "Querétaro",
    latitude: 20.5776,
    longitude: -100.3662,
  },
  {
    aliases: ["santos", "santos laguna"],
    stadium: "Estadio Corona",
    city: "Torreón",
    latitude: 25.6288,
    longitude: -103.3795,
  },
  {
    aliases: ["tigres", "tigres uanl"],
    stadium: "Estadio Universitario",
    city: "San Nicolás de los Garza",
    latitude: 25.7226,
    longitude: -100.311,
  },
  {
    aliases: ["tijuana", "club tijuana", "xolos"],
    stadium: "Estadio Caliente",
    city: "Tijuana",
    latitude: 32.5056,
    longitude: -116.9931,
  },
  {
    aliases: ["toluca"],
    stadium: "Estadio Nemesio Díez",
    city: "Toluca",
    latitude: 19.2871,
    longitude: -99.6663,
  },
];

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function enrichLigaMxVenue(team: TeamSummary) {
  if (team.latitude != null && team.longitude != null) return team;
  const teamName = normalized(team.name);
  const venue = venues.find((candidate) =>
    candidate.aliases.some(
      (alias) => teamName === alias || teamName.includes(alias),
    ),
  );
  if (!venue) return team;
  return { ...team, ...venue, aliases: undefined } as TeamSummary;
}

export function enrichMatchVenue(match: MatchSummary): MatchSummary {
  const home = enrichLigaMxVenue(match.home);
  return {
    ...match,
    home,
    away: enrichLigaMxVenue(match.away),
    venue:
      match.venue === "Por confirmar" && home.stadium
        ? home.stadium
        : match.venue,
  };
}
