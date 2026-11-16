import 'react';

// Lets `style` objects set CSS custom properties without a cast.
declare module 'react' {
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined;
  }
}
