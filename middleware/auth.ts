import { Request, Response, NextFunction } from 'express';
import { APIUserScopes, APIPayment } from '@pinetwork-js/api-typing';
import config from '../config';

// Mock Pi object for server-side use
const Pi = {
  init: () => {},
  authenticate: async (scopes: APIUserScopes[], onIncompletePaymentFound: (payment: APIPayment) => void) => {
    // This is a mock implementation. In a real scenario, you'd need to implement
    // server-side authentication logic here.
    console.log('Mock Pi.authenticate called with scopes:', scopes);
    return {
      user: {
        uid: 'mock-uid',
        username: 'mock-username',
      },
    };
  },
};

// Initialize the Pi client
Pi.init();

const onIncompletePaymentFound = (payment: APIPayment) => {
  console.log('Incomplete payment found:', payment);
  // Handle incomplete payment here
};

export const authenticatePiUser = async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.headers.authorization?.split(' ')[1];

  if (!accessToken) {
    return res.status(401).json({ message: 'No access token provided' });
  }

  try {
    const scopes: APIUserScopes[] = ['username', 'payments', 'wallet_address'];
    const authResult = await Pi.authenticate(scopes, onIncompletePaymentFound);
    (req as any).user = authResult.user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid access token' });
  }
};





















