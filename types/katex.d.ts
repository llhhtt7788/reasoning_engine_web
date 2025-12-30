declare module 'katex' {
  export function renderToString(tex: string, options?: {throwOnError?: boolean, displayMode?: boolean}): string;
  const katex: { renderToString: typeof renderToString };
  export default katex;
}

