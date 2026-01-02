declare module 'isomorphic-dompurify' {
  export type DOMPurifyLike = {
    sanitize(input: string): string;
  };

  export default function createDOMPurify(window?: Window | typeof globalThis): DOMPurifyLike;
}

