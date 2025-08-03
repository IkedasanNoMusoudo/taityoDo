// Cloudflare Workers D1 Database type definitions

declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement
    dump(): Promise<ArrayBuffer>
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>
    exec(query: string): Promise<D1ExecResult>
  }

  interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement
    first<T = unknown>(colName?: string): Promise<T | null>
    run(): Promise<D1Result>
    all<T = unknown>(): Promise<D1Result<T>>
    raw<T = unknown>(): Promise<T[]>
  }

  interface D1Result<T = Record<string, unknown>> {
    results: T[]
    success: boolean
    meta: {
      served_by?: string
      duration?: number
      changes?: number
      last_row_id?: number
      rows_read?: number
      rows_written?: number
    }
  }

  interface D1ExecResult {
    count: number
    duration: number
  }

  // Cloudflare Workers specific types
  interface RequestInitCfProperties {
    cf?: {
      cacheEverything?: boolean
      cacheTtl?: number
      cacheTtlByStatus?: Record<string, number>
      minify?: {
        javascript?: boolean
        css?: boolean
        html?: boolean
      }
      mirage?: boolean
      polish?: 'off' | 'lossy' | 'lossless'
      resolveOverride?: string
      apps?: boolean
      image?: {
        fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'
        gravity?: 'auto' | 'left' | 'right' | 'top' | 'bottom' | 'center'
        height?: number
        width?: number
        quality?: number
        format?: 'auto' | 'webp' | 'json' | 'jpeg' | 'jpg' | 'png' | 'gif'
        [key: string]: any
      }
    }
  }

  interface ScheduledController {
    scheduledTime: number
    cron: string
    noRetry(): void
  }

  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void
    passThroughOnException(): void
  }
}