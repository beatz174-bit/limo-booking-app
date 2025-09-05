import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import * as logger from '@/lib/logger';
import ProfileForm from './ProfileForm';

const stripePromise = (async () => {
  try {
    return await loadStripe(
      import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
    );
  } catch (err) {
    logger.warn('pages/Profile/ProfilePage', 'Stripe init failed', err);
    return null;
  }
})();

const ProfilePage = () => (
  <Elements stripe={stripePromise}>
    <ProfileForm />
  </Elements>
);

export default ProfilePage;
