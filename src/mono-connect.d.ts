// Types for @mono.co/connect.js (the package ships none). Based on its README (v2.2.0).
declare module '@mono.co/connect.js' {
  type MonoConnectOptions = {
    key: string
    scope?: 'auth' | 'payments'
    data?: { customer: { name: string; email: string } | { id: string } }
    reference?: string
    onSuccess: (data: { code: string }) => void
    onClose?: () => void
    onLoad?: () => void
    onEvent?: (eventName: string, data: unknown) => void
  }
  export default class MonoConnect {
    constructor(options: MonoConnectOptions)
    setup(): void
    open(): void
    close(): void
    reauthorise(accountId: string): void
  }
}
