import 'express-session';
import { UserDocument } from '../models/schemas';
import { Request } from 'express';
import { Multer } from 'multer';

declare module 'express-session' {
  interface Session {
    user?: UserDocument;
    accessToken?: string;
  }
}

declare module 'express' {
  interface Request {
    session: Session & {
      user?: UserDocument;
      accessToken?: string;
    };
    file?: Multer.File;
  }
}













