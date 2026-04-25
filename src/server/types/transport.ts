export interface MdanRequest {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string | undefined>;
  query?: Record<string, string>;
  body?: string;
  cookies?: Record<string, string>;
}

export interface MdanResponse {
  status: number;
  headers: Record<string, string>;
  body: string | AsyncIterable<string>;
}
