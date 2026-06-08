# VectorVault

VectorVault is a Retrieval-Augmented Generation (RAG) web application built with Next.js. It allows users to upload various document types, process them into vector embeddings, and interact seamlessly with the data using an AI chat interface powered by Google Gemini.

## Features

- **Document Ingestion:** Support for parsing multiple file formats including PDF, Excel, and Email.
- **Vector Search:** Utilizes Supabase (with `pgvector`) for storing embeddings and performing fast similarity searches.
- **AI Chat:** Interactive chat interface powered by Google Gemini.
- **Source Tracking & Conflict Resolution:** Keeps track of source documents and flags potential conflicts in the retrieved context.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Frontend:** React, Tailwind CSS (assumed based on standard Next.js setups)
- **Database & Vector Store:** Supabase (PostgreSQL + pgvector)
- **AI Model:** Google Gemini API

## Screenshots
<img width="1919" height="972" alt="image" src="https://github.com/user-attachments/assets/08f3a9a3-25b8-4547-b7fb-334f170d1fc0" />


## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A [Supabase](https://supabase.com/) account and project
- A [Google Gemini API Key](https://aistudio.google.com/)

## Getting Started

### 1. Install Dependencies

Navigate to the project directory and install the required packages:

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root of your project and add the necessary environment variables. (See the `.env.local` file you just edited or use the template below):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Database Setup

Set up the Supabase database schema for vector storage.

1. Go to your Supabase project dashboard.
2. Navigate to the SQL Editor.
3. Copy the contents of `supabase/schema.sql` and run the script to create the necessary tables and functions (including the `pgvector` extension).

### 4. Run the Development Server

Start the Next.js development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

- `src/app/` - Next.js App router pages and API routes (`/api/ask`, `/api/ingest`, `/api/sources`).
- `src/components/` - React components including the Chat Interface, Sidebar, and Upload Panel.
- `src/lib/` - Core logic for chunking texts, connecting to Gemini/Supabase, and parsers for various file formats.
- `supabase/` - SQL scripts for setting up the Supabase database.
