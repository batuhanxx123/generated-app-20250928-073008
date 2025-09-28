# VaultNote - Secure Personal Notepad

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/batuhanxx123/generated-app-20250928-072937)

VaultNote is a minimalist, secure, and private notepad application built on Cloudflare's edge network. It provides a single, full-screen text editor for users to write and save their notes. Access to the notepad is protected by a single password. The application features a clean, focused, and visually stunning interface with a strong emphasis on user experience and simplicity. All notes are tied to the password, ensuring privacy. If the password is forgotten, the notes are irrecoverable, providing a true sense of security through obscurity.

## Key Features

-   **Secure Access**: Your notes are protected by a single password.
-   **Minimalist UI**: A clean, distraction-free writing environment to help you focus.
-   **Private by Design**: Notes are tied to your password. No password, no access. There is no recovery mechanism.
-   **Edge-Powered**: Built on Cloudflare Workers and Durable Objects for global speed and reliability.
-   **Instant Save**: Quickly save your notes with a single click.
-   **Responsive Design**: A flawless experience across all your devices.

## Technology Stack

-   **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Framer Motion, Zustand
-   **Backend**: Cloudflare Workers, Hono
-   **Storage**: Cloudflare Durable Objects
-   **Language**: TypeScript

## Getting Started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   [Bun](https://bun.sh/) package manager
-   [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/vaultnote.git
    cd vaultnote
    ```

2.  **Install dependencies:**
    ```sh
    bun install
    ```

3.  **Run the development server:**
    This command starts the Vite frontend server and the Wrangler development server for the backend worker.
    ```sh
    bun dev
    ```
    The application will be available at `http://localhost:3000`.

## Project Structure

-   `src/`: Contains the frontend React application code.
    -   `pages/`: Main application pages. `HomePage.tsx` is the entry point.
    -   `components/`: Shared UI components.
    -   `lib/`: Utility functions and API client.
-   `worker/`: Contains the Cloudflare Worker backend code.
    -   `index.ts`: The entry point for the worker.
    -   `user-routes.ts`: Defines the API routes for the application.
    -   `entities.ts`: Defines the data models that interact with Durable Objects.
-   `shared/`: Contains TypeScript types shared between the frontend and backend.

## Deployment

This project is configured for easy deployment to Cloudflare's global network.

1.  **Login to Wrangler:**
    Authenticate the Wrangler CLI with your Cloudflare account.
    ```sh
    wrangler login
    ```

2.  **Deploy the application:**
    This command will build the frontend application and deploy both the static assets and the worker to Cloudflare.
    ```sh
    bun deploy
    ```

Alternatively, you can deploy directly from your GitHub repository using the button below.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/batuhanxx123/generated-app-20250928-072937)

## Architecture Overview

VaultNote is a Single-Page Application (SPA) built with React. It communicates with a backend API running on a Cloudflare Worker, which is built using the Hono framework.

State persistence is handled by a single `GlobalDurableObject` instance. Each user's notepad is stored as a separate entity within this Durable Object, partitioned by a key derived from their password. This ensures data isolation and security through obscurity.

## Security Considerations

-   **Password Loss**: Forgetting your password means your notes are permanently lost. There is **no password recovery** mechanism. This is a feature, not a bug, to ensure maximum privacy.
-   **Data Storage**: Note content is stored as plain text within the Durable Object on Cloudflare's servers. It is not end-to-end encrypted.
-   **Session Management**: The password is held in memory on the client-side for the duration of the session. Closing the browser tab or logging out will require you to enter the password again.