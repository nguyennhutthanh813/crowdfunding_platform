// @types/node đang theo bộ của Next trong dự án, còn Node 24 đã có node:sqlite.
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      run(...values: Array<string | number | null>): unknown;
      get(...values: Array<string | number | null>): Record<string, string | number | null> | undefined;
      all(...values: Array<string | number | null>): Array<Record<string, string | number | null>>;
    };
  }
}
