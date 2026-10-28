import { HttpPlatformApi } from "./http-api";

const apiUrl =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001/api";

export const api = new HttpPlatformApi(apiUrl);
export type * from "./contracts";
