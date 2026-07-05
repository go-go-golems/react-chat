export type TimelineEntity = {
  id: string;
  kind: string;
  createdAt: number;
  updatedAt?: number;
  version?: number;
  props: Record<string, unknown>;
};

export type TimelineState = {
  byId: Record<string, TimelineEntity>;
  order: string[];
};
