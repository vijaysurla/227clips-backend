import { Session } from 'express-session';

declare module 'express-serve-static-core' {
  interface Request {
    session: Session & {
      user?: any;
      accessToken?: string;
    };
  }
}

declare module 'express-session' {
  interface SessionData {
    user?: any;
    accessToken?: string;
  }
}







