declare module 'isomorphic-dompurify' {
  export default function createDOMPurify(window?: any): {
    sanitize(input: string): string;
  };
}

