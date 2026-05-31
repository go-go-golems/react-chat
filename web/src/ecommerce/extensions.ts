import { defineChatExtensions } from '@go-go-golems/chat-provider';
import { cartReviewWidget } from './CartReview';
import { checkoutNudgeWidget } from './CheckoutNudge';
import { productCarouselWidget } from './ProductCarousel';

export const ecommerceExtensions = defineChatExtensions({
  name: 'ecommerce-demo',
  widgets: [productCarouselWidget, cartReviewWidget, checkoutNudgeWidget],
});
