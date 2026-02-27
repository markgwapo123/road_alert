<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# RoadAlert Client App Instructions
- This is a Vite React project for the RoadAlert user web application.
- The app must support JWT authentication, user profile verification, report submission with image upload and geolocation, and a news feed for verified reports.
- Use clean, responsive UI with a navbar (logo, location, app name, user profile, report button).
- All API calls must use the existing backend (Express.js, MongoDB) on port 3001.
- Only verified users can submit reports; unverified users can view the news feed but not report.
- Reports must include type, severity, description, image, and auto-detected location.
- Admin can verify/reject reports; only verified reports appear in the news feed.
