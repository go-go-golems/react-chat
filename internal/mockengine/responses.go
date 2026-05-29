package mockengine

// Response is a canned mock response selected by substring matching against the
// submitted prompt.
type Response struct {
	Pattern string
	Text    string
	Widgets []WidgetSpec
	Error   string
	Long    bool
}

// WidgetSpec describes a widget emitted by the mock engine.
type WidgetSpec struct {
	Name        string
	Props       map[string]any
	StreamParts int
}

func defaultResponses() []Response {
	return []Response{
		{
			Pattern: "boots",
			Text:    "Here are some great boots I found for you:",
			Widgets: []WidgetSpec{{
				Name:        "ProductCarousel",
				StreamParts: 1,
				Props: map[string]any{
					"title": "Recommended Boots",
					"products": []any{
						map[string]any{"id": "boot-1", "handle": "hiking-boot-pro", "title": "TrailBlazer Pro", "imageUrl": "https://placehold.co/200x200?text=Boot+1", "price": map[string]any{"amount": 149.99, "currency": "USD"}, "badges": []any{"Best Seller"}},
						map[string]any{"id": "boot-2", "handle": "winter-boot-deluxe", "title": "ArcticShield Deluxe", "imageUrl": "https://placehold.co/200x200?text=Boot+2", "price": map[string]any{"amount": 199.99, "currency": "USD"}, "badges": []any{"New"}},
						map[string]any{"id": "boot-3", "handle": "casual-boot-everyday", "title": "UrbanWalker Everyday", "imageUrl": "https://placehold.co/200x200?text=Boot+3", "price": map[string]any{"amount": 89.99, "currency": "USD"}, "badges": []any{}},
					},
					"reason": "Based on your interest in outdoor gear",
				},
			}},
		},
		{
			Pattern: "cart",
			Text:    "Here's what's in your cart right now:",
			Widgets: []WidgetSpec{{
				Name: "CartReview",
				Props: map[string]any{
					"items": []any{
						map[string]any{"id": "item-1", "title": "TrailBlazer Pro", "variant": "Size 10 / Brown", "quantity": 1, "price": "$149.99"},
						map[string]any{"id": "item-2", "title": "Wool Socks 3-Pack", "variant": "One Size", "quantity": 2, "price": "$24.99"},
					},
					"subtotal":       "$199.97",
					"recommendation": "Add the ArcticShield Deluxe for 20% off!",
				},
			}},
		},
		{
			Pattern: "checkout",
			Text:    "Ready to check out? Here's a quick summary:",
			Widgets: []WidgetSpec{{
				Name: "CheckoutNudge",
				Props: map[string]any{
					"label":       "Complete Your Order",
					"checkoutUrl": "https://example.com/checkout",
					"reason":      "Your cart total is $199.97. Free shipping on orders over $150!",
				},
			}},
		},
		{
			Pattern: "error test",
			Error:   "mock error requested by prompt",
		},
		{
			Pattern: "long response",
			Text:    "This is a deliberately long mock response used to test cancellation. It streams for long enough that a stop command can interrupt it before completion.",
			Long:    true,
		},
	}
}
