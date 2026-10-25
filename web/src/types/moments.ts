import type { MediaFace, MomentHero, MomentKind } from "./journey";

export interface MomentInfo {
  id: string;
  dayId: number;
  kind: MomentKind;
  sortOrder: number | null;
  heroMediaId: string | null;
}

export interface MomentMediaItem {
  id: string;
  type: "photo" | "video";
  width: number;
  height: number;
  durationS: number | null;
  blurhash: string | null;
  thumbUrl: string;
  webUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  faces: MediaFace[];
}

export interface MomentPerson {
  id: string;
  nickname: string;
}

export interface MomentDetailResponse {
  moment: MomentInfo;
  hero: MomentHero | null;
  media: MomentMediaItem[];
  people: MomentPerson[];
}

export interface MomentsContent {
  moment: Record<string, { title: string; story?: string }>;
}
