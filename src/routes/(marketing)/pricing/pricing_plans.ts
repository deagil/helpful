export const defaultPlanId = "free"

export const pricingPlans = [
  {
    id: "free",
    name: "Community",
    description: "Everything to manage your data.",
    price: "$0",
    priceIntervalName: "forever",
    stripe_price_id: null,
    features: [
      "Manage your Supabase database",
      "Visual workflow builder and scheduling",
      "View and map Tally form responses",
      "Integrate Zapier and other tools"
    ],
  },
  {
    id: "supahelpful",
    name: "Business",
    description:
      "Powerful enhancements for your whole stack.",
    price: "$30",
    priceIntervalName: "per month",
    stripe_price_id: "price_1QNyylHWBB0yEJuLAuWRZ5W0",
    stripe_product_id: "prod_RGW0eXqSuHJdjh",
    features: [
      "Everything in Community plus:",
      "Query across all your systems and data with AI",
      "Advanced data reporting and insights",
      "Auto-generate workflow documentation",
    ],
  }
]
