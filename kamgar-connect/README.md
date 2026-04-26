# Kamgar Connect — Backend

India's first GPS-powered labour marketplace. Connecting verified daily wage workers with employers instantly.

## Deployment Setup (Railway.app)

1.  Connect this repository to your Railway project.
2.  Add the environment variables listed below.
3.  Ensure your MongoDB database is accessible.
4.  The server automatically starts using `npm start`.

## Environment Variables Needed

The following variables must be set in your `.env` file or hosting environment:

| Variable | Description |
| :--- | :--- |
| `PORT` | The port the server listens on (default 3000) |
| `MONGODB_URI` | Connection string for MongoDB |
| `JWT_SECRET` | Secret key for JWT authentication |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID for voice/SMS |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Your Twilio virtual phone number |
| `GEMINI_API_KEY` | Google Generative AI API key (Mitra AI) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for TTS |
| `ADMIN_PASSWORD` | Password for admin dashboard access |

## Local Development

1.  Clone the repo.
2.  Run `npm install`.
3.  Create a `.env` file based on `.env.example`.
4.  Run `npm run dev` to start the server.
