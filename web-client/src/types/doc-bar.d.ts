declare module '@bottomlessmargaritas/doc-bar' {
  import { FC } from 'react';

  interface AppDocBarProps {
    appName?: string;
    position?: 'top' | 'bottom';
    fixed?: boolean;
    theme?: 'dark' | 'light';
    basePath?: string;
  }

  const AppDocBar: FC<AppDocBarProps>;
  export default AppDocBar;
}

declare module '@bottomlessmargaritas/doc-bar/styles.css' {}
