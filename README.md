# Precred Admin Panel

A comprehensive, modern admin panel built with React, TypeScript, and Vite. This platform provides a complete solution for managing content, operations, and business workflows.

## 🚀 Features

### 📊 Overview
- **Dashboard** - Analytics with metrics, charts, and KPIs

### 📝 Content Management
- **Events** - Create and manage events with scheduling
- **Classes** - Educational course management
- **Applications** - Form management with custom statuses
- **Raffles** - Raffle creation with participant tracking & winner picking
- **Donations** - Donation campaign management
- **Newsletters** - Newsletter content management
- **Blogs** - Blog post creation and publishing

### ⚙️ Operations
- **Orders** - Booking management with filtering, CSV export, bulk operations
- **All Applications** - Runtime submissions with bulk actions & email sending
- **Leads** - Lead management with CSV import & campaign assignment
- **Members** - Customer directory with role/status management
- **Tasks** - Task management with Kanban board & list views
- **Communications** - Email/SMS/phone communication history
- **Marketing** - Campaign leads & Postmark email integration

### 📂 Directory
- **Vendors** - Vendor management with applications by status
- **Sponsors** - Sponsor management

### 🔧 System
- **Images** - Media library for images, videos, YouTube URLs
- **Automations** - Workflow automation builder with triggers & activities
- **Settings** - Shop configuration & custom status management

### 🔐 Additional Features
- Role-based access control (RBAC)
- Custom configurable statuses per content type
- Postmark email template integration
- Related items linking
- Sharable links generation
- Notes system for orders, leads, customers
- Bulk operations (CSV export, status updates, campaign assignment)
- Dark/Light mode toggle
- Mobile responsive design

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Authentication**: Clerk
- **Forms**: React Hook Form
- **State Management**: React Context
- **Routing**: React Router
- **UI Components**: Radix UI primitives

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/KhadyotTakale/precred.git

# Navigate to the project directory
cd precred

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
VITE_ELEGANT_API_KEY=your_api_key
VITE_ELEGANT_API_URL=your_api_url
```

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React context providers
├── hooks/          # Custom React hooks
├── lib/            # API clients and utilities
├── pages/          # Page components
└── assets/         # Static assets
```

## 🚀 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 📖 API Integration

This admin panel integrates with:
- **Elegant API** - Core business logic and data
- **Postmark** - Transactional email service
- **Clerk** - Authentication and user management

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Authors

- Khadyot Takale

---

Built with ❤️ using React and TypeScript
