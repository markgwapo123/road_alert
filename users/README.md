# BantayDalan Client Web Application

This project is a React.js web app for users to report road hazards, view verified reports, and manage their profile. It connects to the same backend as the admin dashboard (Express.js + MongoDB).

## Features
- **Login/Register** with JWT authentication
- **User Profile** with identity verification
- **Dashboard/News Feed** for verified reports
- **Report Submission**: Upload image, description, type, severity, and auto-location
- **Responsive Navbar**: Logo, location, app name, user profile, report button
- **Only verified users can submit reports**
- **Offline support** (basic)

## Getting Started
1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the development server:
   ```sh
   npm run dev
   ```
3. The app will be available at `http://localhost:5173` by default.

## API
- All API calls go to the backend at `http://localhost:3001`.

## Project Structure
- `src/pages/` - Login, Register, Dashboard, Profile, Report
- `src/components/` - Navbar, ReportForm, NewsFeed, etc.
- `src/api/` - Axios instance and API calls

---

For more details, see the `.github/copilot-instructions.md` file.
