// Re-export ErrorProvider and useErrorHandler from the single source
// implementation in `hooks/useErrorHandler.tsx` to avoid duplicate context
// instances during tests (which caused "must be used within ErrorProvider"
// errors when different modules created separate contexts).
export { ErrorProvider, useErrorHandler } from '@/hooks/useErrorHandler.tsx';