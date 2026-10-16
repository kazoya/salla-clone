# Gap analysis: Salla clone vs. the real Salla (salla.sa)

The real product was studied from its public pages (salla.sa homepage, feature sections, sector pages), looking at **features, flows and layout only**. No branding, assets or code were copied. Date: 2026-10-16.

## What the real Salla offers (public claims)
- **Store creation:** create a store in minutes, with ready-made **themes** you can customize (and custom themes via "Twilight").
- **Payments:** many payment methods, plus purchase without creating an account.
- **Shipping:** 100+ shipping carriers, local and international; customers choose a shipping option at checkout.
- **Marketing:** **discount coupons**, offers/promotions, affiliate marketers, abandoned-cart targeting, ad campaigns.
- **Operations:** inventory, branches/warehouses, ERP links, an app store (550+ apps), and merchant services.
- **Customer experience:** a simple checkout and **order tracking**.
- **Merchant dashboard:** sales analytics.
- **Catalogue:** sector-oriented catalogues with **categories** and **product options** (size, color, …).
- **Languages:** multilingual storefronts (40+ languages).

## Where the clone stood (before this round)
| Area | Clone | Gap |
|---|---|---|
| Store look | Same look for every store | No per-store theme (color, description) |
| Catalogue | Flat product list | No categories, no options/variants |
| Checkout | Name/phone/address, then a simulated card | No shipping choice, no coupons, no order summary |
| After purchase | Order ID shown once | No order tracking or status history |
| Merchant | Counts only | No revenue trend, top products or status breakdown, no coupon management |
| Admin | Users/stores/products/orders | OK for the demo |
| i18n / theme | AR/EN, light/dark | OK |

## Priority (impact ÷ effort) and decision
1. **Checkout: shipping options + coupons + order summary**, all computed server-side. *Shipped.*
2. **Order tracking:** tracking code + phone, with a status timeline; the merchant updates the status. *Shipped.*
3. **Categories + product options (variants)** on the storefront, with category filter chips. *Shipped.*
4. **Theme-able storefront:** each merchant picks an accent color and a description. *Shipped.*
5. **Merchant analytics:** 14-day revenue chart, top products, orders by status, average order value. *Shipped.*
6. **Merchant coupon management:** create, list, enable/disable. *Shipped.*

## Remaining (not attempted; larger or needs external services)
- Real payment gateway and real shipping carriers (need merchant accounts).
- Inventory and stock per variant, warehouses, abandoned-cart reminders (need email/SMS), affiliate system.
- App store, custom theme code (Twilight-like), 40+ languages.
