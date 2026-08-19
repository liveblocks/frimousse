/**
 * Frimousse only targets the browser so Node's types aren't installed, but
 * `process.env.NODE_ENV` is used to strip development-only code and is replaced
 * at build time by bundlers. This minimal declaration covers that usage.
 */
declare const process: {
  env: {
    NODE_ENV?: string;
  };
};
