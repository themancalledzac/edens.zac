export const isLocalEnvironment = () => {
  return process.env.NEXT_PUBLIC_ENV === 'local' || process.env.NODE_ENV === 'development';
};

export const isProduction = () => {
  return (
    process.env.NEXT_PUBLIC_ENV === 'production' ||
    (!isLocalEnvironment() && process.env.NODE_ENV === 'production')
  );
};
