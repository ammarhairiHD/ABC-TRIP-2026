export interface PersonAvatar {
  thumbUrl: string;
  box: { x: number; y: number; w: number; h: number } | null;
}

export interface PersonListItem {
  id: string;
  nickname: string;
  role: string;
  mediaCount: number;
  avatar: PersonAvatar | null;
}

export interface PeopleResponse {
  people: PersonListItem[];
}

export interface TrailBuddy {
  id: string;
  nickname: string;
  count: number;
}

export interface PersonDetail {
  id: string;
  nickname: string;
  mediaCount: number;
  daysPresent: number[];
  mostWith: TrailBuddy[];
}

export interface PersonMediaItem {
  id: string;
  type: "photo" | "video";
  dayId: number;
  seq: number | null;
  category: string;
  width: number;
  height: number;
  durationS: number | null;
  blurhash: string | null;
  thumbUrl: string;
  webUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
}

export interface PersonDetailResponse {
  person: PersonDetail;
  media: PersonMediaItem[];
}

export interface PeopleContent {
  person: Record<string, { trait?: string; badges?: string[]; links?: { instagram?: string } }>;
}
