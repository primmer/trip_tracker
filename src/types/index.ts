export interface Trip {
  id: string;
  hashtag: string | null;
  name: string;
  dateRange: {
    start: string;
    end: string;
  };
  activityIds: number[];
}

export interface Activity {
  id: number;
  name: string;
  start_date: string;
  distance: number;
  total_elevation_gain: number;
  elapsed_time: number;
  description: string | null;
  map: {
    summary_polyline: string;
  };
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
}
