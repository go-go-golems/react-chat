// Ecommerce preset: registers all ecommerce widget renderers
export { productCarouselWidget, ProductCarouselWidget } from './ProductCarousel';
export { cartReviewWidget, CartReviewWidget } from './CartReview';
export { checkoutNudgeWidget, CheckoutNudgeWidget } from './CheckoutNudge';

// Import to trigger side-effect registration
import './ProductCarousel';
import './CartReview';
import './CheckoutNudge';
