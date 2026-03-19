import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface MasterPasswordCtx {
  masterPassword: string | null
  setMasterPassword: (pw: string | null) => void
}

const Ctx = createContext<MasterPasswordCtx>({
  masterPassword: null,
  setMasterPassword: () => {},
})

export function MasterPasswordProvider({ children }: { children: ReactNode }) {
  const [masterPassword, setMasterPassword] = useState<string | null>(null)
  return (
    <Ctx.Provider value={{ masterPassword, setMasterPassword }}>
      {children}
    </Ctx.Provider>
  )
}

export function useMasterPassword() {
  return useContext(Ctx)
}
