// Simple 404 error page.
import { Link } from 'react-router-dom';
import taxi404 from '@/assets/404.png'; // adjust path as needed
import CdnAsset from '@/components/CdnAsset';

const PageNotFound = () => {
  return (
    <div className="page-not-found">
      <h1>404 – We Took a Wrong Turn!</h1>
      <CdnAsset src={taxi404}>
        <img
          alt="Cartoon limo blowing steam - 404 error"
          className="page-not-found__image"
          height={400}
          width={400}
        />
      </CdnAsset>
      <p>Oops! The page you're looking for can’t be found.</p>
      <Link to="/book" className="page-not-found__home-link">← Back to Home</Link>
    </div>
  );
};

export default PageNotFound;
