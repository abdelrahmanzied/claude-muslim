// This repo has no @types/node. Only the Node APIs used by our
// developer scripts are declared here; fetch/web globals come from lib.dom.
declare const process: { argv: string[]; exitCode?: number }
declare module 'node:fs/promises' {
  export function readFile(path: string, encoding: 'utf8'): Promise<string>
  export function writeFile(path: string, data: string, encoding: 'utf8'): Promise<void>
  export function mkdir(path: string, options: { recursive: true }): Promise<unknown>
  export function rename(from: string, to: string): Promise<void>
}
declare module 'node:path' {
  export function resolve(...paths: string[]): string
  export function dirname(path: string): string
  export function relative(from: string, to: string): string
}
declare module 'node:url' {
  export function pathToFileURL(path: string): URL
}
