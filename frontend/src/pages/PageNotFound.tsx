// Simple 404 error page.
import { Link } from 'react-router-dom';
import taxi404 from '@/assets/404.png'; // adjust path as needed

const cdnBase = import.meta.env.VITE_CDN_BASE_URL;
const PageNotFound = () => {
      const imageSrc =
    import.meta.env.PROD && cdnBase
      ? `${cdnBase}${taxi404}`
      : taxi404;
  return (
    <div className="page-not-found">
      <h1>404 – We Took a Wrong Turn!</h1>
      <img src={imageSrc} alt="Cartoon limo blowing steam - 404 error" className="page-not-found__image" height={400} width={400}/>
      <p>Oops! The page you're looking for can’t be found.</p>
      <Link to="/book" className="page-not-found__home-link">← Back to Home</Link>
    </div>
  );
};

export default PageNotFound;
