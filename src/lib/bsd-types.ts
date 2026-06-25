// Client-safe types mirroring a subset of the BSD API response shapes.
// These are intentionally narrow — only the fields we currently read.

export interface BsdSeason {
  id: number;
  name: string;
  year: number | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
}

export interface BsdLeague {
  id: number;
  name: string;
  country: string;
  is_women: boolean;
  is_active: boolean;
  current_season: BsdSeason | null;
}

export interface BsdPaginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface BsdEventListItem {
  id: number;
  league_id: number;
  season_id: number | null;
  home_team_id: number;
  home_team: string;
  away_team_id: number;
  away_team: string;
  venue_id: number | null;
  event_date: string;
  status: string;
  period?: string | null;
  current_minute?: number | null;
  round_number: number | null;
  round_name: string | null;
  group_name?: string | null;
  home_score: number | null;
  away_score: number | null;
  referee_id?: number | null;
  home_coach_id?: number | null;
  away_coach_id?: number | null;
  is_local_derby?: boolean | null;
  is_neutral_ground?: boolean | null;
  travel_distance_km?: number | null;
  pitch_condition?: string | null;
  attendance?: number | null;
  weather?: {
    code?: number | null;
    description?: string | null;
    wind_speed?: number | null;
    temperature_c?: number | null;
  } | null;
  head_to_head?: BsdH2H | null;
}


export type BsdPosition = "G" | "D" | "M" | "F";

export interface BsdLineupPlayer {
  id: number;
  name: string;
  short_name: string | null;
  position: BsdPosition | string;
  jersey_number: number | null;
  ai_score: number | null;
}

export interface BsdTeamLineup {
  team_id: number;
  team_name: string;
  formation: string | null;
  confidence: number | null;
  players: BsdLineupPlayer[];
  substitutes: BsdLineupPlayer[];
}

export type BsdLineupStatus = "unavailable" | "predicted" | "confirmed" | string;

export interface BsdEventLineups {
  event_id: number;
  lineup_status: BsdLineupStatus;
  beta: boolean;
  updated_at: string | null;
  lineups: { home: BsdTeamLineup | null; away: BsdTeamLineup | null } | null;
  unavailable_players: Json | null;
}

// JSON-shaped pass-through types so server fns stay serializable across the
// SSR boundary. We'll tighten these once Phase 2 needs structured access.
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export type BsdPrediction = Json;
export type BsdOdds = Json;

export interface BsdWeather {
  code?: number | null;
  description?: string | null;
  wind_speed?: number | null;
  temperature_c?: number | null;
}

export interface BsdVenueInfo {
  id: number;
  name: string;
  city?: string | null;
  country?: string | null;
  country_code?: string | null;
  capacity?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  pitch_length_m?: number | null;
  pitch_width_m?: number | null;
  built_year?: number | null;
}

export interface BsdRefereeInfo {
  id: number;
  name: string;
  country?: string | null;
  nationality_a3?: string | null;
  matches?: number | null;
  total_yellow_cards?: number | null;
  total_red_cards?: number | null;
  avg_yellow_per_match?: number | null;
  avg_red_per_match?: number | null;
  avg_goals_per_match?: number | null;
  avg_fouls_per_match?: number | null;
  career_games?: number | null;
  career_yellow_cards?: number | null;
  career_red_cards?: number | null;
}

export interface BsdH2H {
  total_matches: number;
  home_wins: number;
  draws: number;
  away_wins: number;
  home_goals?: number | null;
  away_goals?: number | null;
  avg_total_goals?: number | null;
  home_win_rate?: number | null;
  away_win_rate?: number | null;
  recent_matches?: Json;
}

// Manager / coach profile — /api/v2/managers/{id}/
export interface BsdManager {
  id: number;
  name: string;
  short_name?: string | null;
  country?: string | null;
  tactical_profile?: string | null;
  preferred_formation?: string | null;
  current_team_id?: number | null;
  matches_total?: number | null;
  wins?: number | null;
  draws?: number | null;
  losses?: number | null;
  win_pct?: number | null;
  avg_goals_scored?: number | null;
  avg_goals_conceded?: number | null;
  avg_possession?: number | null;
  clean_sheet_pct?: number | null;
  btts_pct?: number | null;
  over_25_pct?: number | null;
  stats_updated_at?: string | null;
}

// Player profile — /api/v2/players/{id}/
export interface BsdPlayerDetail {
  id: number;
  name: string;
  short_name?: string | null;
  position?: string | null;
  specific_position?: string | null;
  jersey_number?: number | null;
  date_of_birth?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  preferred_foot?: string | null;
  nationality?: string | null;
  current_team_id?: number | null;
  national_team_id?: number | null;
  market_value_eur?: number | null;
  contract_until?: string | null;
  availability?: string | null;
  attributes?: Json | null;
  strengths?: string[] | null;
  weaknesses?: string[] | null;
  rating?: number | null;
  potential?: number | null;
  injury_risk?: string | number | null;
  wage_eur_annual?: number | null;
}

// Player career — /api/v2/players/{id}/career/
export interface BsdCareerSeason {
  season_id: number;
  league_id: number;
  team_id: number;
  matches: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  avg_rating: number | null;
}

export interface BsdPlayerCareer {
  player_id: number;
  seasons: BsdCareerSeason[];
}
