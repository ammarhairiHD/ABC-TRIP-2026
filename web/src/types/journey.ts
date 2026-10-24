export interface JourneyDay {
  id: number;
  date: string;
  altitudeM: number | null;
  half: "climb" | "home";
  mediaCount: number;
  coverThumbUrl: string | null;
}

export interface JourneyResponse {
  days: JourneyDay[];
  totals: {
    days: number;
    media: number;
  };
}

export interface DayContent {
  title: string;
  story: string;
}
