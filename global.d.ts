// This file helps TypeScript understand how to resolve module paths

declare module '@/lib/netlifyUtils' {
  export * from './lib/netlifyUtils';
}

declare module '@/lib/documentUtils' {
  export * from './lib/documentUtils';
}

declare module '@/lib/utils' {
  export * from './lib/utils';
} 