import { useEffect } from 'react';
import { useToast } from './use-toast';
import { getToken } from './use-auth';

export function useTokenExpiryWarning() {
  const { toast } = useToast();

  useEffect(() => {
    const checkTokenExpiry = () => {
      const token = getToken();
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = payload.exp * 1000;
        const timeLeft = expiryTime - Date.now();
        
        // Warn 5 minutes before expiry
        if (timeLeft > 0 && timeLeft < 5 * 60 * 1000) {
          toast({
            title: 'Session Expiring Soon',
            description: 'Please complete and submit your feedback within 5 minutes.',
            variant: 'default',
          });
        }
        
        // Warn 1 minute before expiry
        if (timeLeft > 0 && timeLeft < 60 * 1000) {
          toast({
            title: 'Session Expiring',
            description: 'Your session will expire in 1 minute. Please submit now!',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error checking token expiry:', error);
      }
    };

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60000);
    checkTokenExpiry(); // Check immediately

    return () => clearInterval(interval);
  }, [toast]);
}
