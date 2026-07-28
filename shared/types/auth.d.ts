declare module '#auth-utils' {
  interface User {
    id: number
    username: string
    displayName: string
    role: 'SUPER_ADMIN' | 'EDITOR'
    sessionVersion: number
  }
}

export {}
