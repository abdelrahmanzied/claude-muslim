// This repo has no @types/node or package.json. Only the Node APIs used by our
// developer scripts are declared here; fetch/web globals come from lib.dom.
declare const process: { argv: string[]; exitCode?: number }
declare module 'node:fs/promises' {
  export function readFile(path: string, encoding: 'utf8'): Promise<string>
  export function writeFile(path: string, data: string, encoding: 'utf8'): Promise<void>
  export function writeFile(path: string, data: Uint8Array): Promise<void>
  export function mkdir(path: string, options: { recursive: true }): Promise<unknown>
  export function rename(from: string, to: string): Promise<void>
  export function readdir(path: string): Promise<string[]>
  export function open(path: string, flags: 'r'): Promise<{
    stat(): Promise<{ size: number; mtimeMs: number }>
    read(buffer: Uint8Array, offset: number, length: number, position: number): Promise<{ bytesRead: number }>
    close(): Promise<void>
  }>
}
declare module 'node:child_process' {
  type Readable = { on(event: 'data', listener: (chunk: Uint8Array) => void): void }
  type Writable = { end(data?: Uint8Array): void; on(event: 'error', listener: (error: Error) => void): void }
  export function spawn(command: string, args: readonly string[], options: { stdio: ['pipe', 'pipe', 'pipe'] }): {
    stdin: Writable; stdout: Readable; stderr: Readable
    on(event: 'error', listener: (error: Error) => void): void
    on(event: 'close', listener: (code: number | null) => void): void
    kill(signal?: string): boolean
  }
}
declare module 'node:path' {
  export function resolve(...paths: string[]): string
  export function dirname(path: string): string
  export function relative(from: string, to: string): string
}
declare module 'node:url' {
  export function pathToFileURL(path: string): URL
}
