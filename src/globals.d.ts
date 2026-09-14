// Bundlers replace `process.env.NODE_ENV` to remove development-only checks.
declare const process: {
  env: {
    NODE_ENV?: string;
  };
};
