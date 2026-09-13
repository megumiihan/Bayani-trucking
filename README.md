# Bayani Trucking

A Next.js prototype for managing trucking deliveries, employee payouts, and route pricing for Bayani Trucking.

## Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS v4**


## Role Switcher

Use the **Employee / Admin** toggle in the top navbar to switch between user flows:

| View | Pages |
|------|-------|
| **Employee** | My Deliveries (home), My Payouts |
| **Admin** | Dashboard (home), Shipments, Employees, Routes & Rates |

## Project Structure

```
app/
  layout.tsx          # Global layout with Navbar + RoleProvider
  page.tsx            # Home (switches view by role)
  admin/
    employees/        # Employee roster
    shipments/        # Full shipment table
    routes/           # Pepsi route pricing
  employee/
    payouts/          # Driver payout tracker
components/
  Navbar.tsx          # Top nav with role switcher
  views/              # EmployeeHome, AdminDashboard
  ui/                 # Badge, PageHeader
context/
  RoleContext.tsx     # Employee / Admin view state
