# AI Music Royalty Platform

This is a [Next.js](https://nextjs.org) project for managing music royalties with AI-powered attribution analysis.

## Features

- **Audio Upload & Analysis**: Upload audio files for attribution analysis
- **Attribution Engine Integration**: Real-time comparison against reference catalog
- **Royalty Management**: Track and manage royalty splits based on attribution results
- **Database Integration**: Supabase-powered data persistence

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+ (for attribution engine)
- Supabase account

### Environment Setup

1. Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Attribution Engine Configuration
NEXT_PUBLIC_ATTRIB_BASE_URL=https://ai-music-royalty-platform.onrender.com
NEXT_PUBLIC_ENVIRONMENT=development
```

**Required Environment Variables:**

- `NEXT_PUBLIC_ATTRIB_BASE_URL`: URL of the attribution engine (production: https://ai-music-royalty-platform.onrender.com)
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `NEXT_PUBLIC_ENVIRONMENT`: Set to 'development' for local development

2. Set up the attribution engine (see [attrib/README.md](./attrib/README.md) for details):

```bash
cd attrib
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Or use the convenient npm script:**

```bash
npm run attrib:dev
```

3. Set up the database by running the SQL schema in `supabase-schema.sql` in your Supabase SQL Editor.

### Running the Application

1. Start the attribution engine (in one terminal):

```bash
npm run attrib:dev
```

2. Start the Next.js development server (in another terminal):

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Testing

Run the test script to verify the attribution engine integration:

```bash
node test-upload.js
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
deploy ping Tue Oct 14 16:51:07 CEST 2025
