import * as process from 'process';

export const isLocalEnvironment = () => {
  return process.env.NEXT_PUBLIC_ENV === 'local' || process.env.NODE_ENV === 'development';
};