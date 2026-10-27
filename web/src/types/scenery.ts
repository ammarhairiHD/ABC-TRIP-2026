export interface SceneryMediaItem {
  id: string;
  type: "photo" | "video";
  dayId: number | null;
  width: number;
  height: number;
  blurhash: string | null;
  thumbUrl: string;
  webUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
}

export interface SceneryResponse {
  media: SceneryMediaItem[];
}
