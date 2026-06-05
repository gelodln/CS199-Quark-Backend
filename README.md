# Quark Backend

Quark is a backend infrastructure built on **Supabase Edge Functions** and **PostgreSQL** to support physics simulations in Unity 2022 LTS. It handles role-based authentication, persistent scene data, and learner attempt tracking.

## Prerequisites

Before setting up the project, ensure you have the following installed:

*   **Docker Desktop**: Required to run the local Supabase stack.
*   **Node.js (v18+)**: Required for CLI and dependency management.
*   **Supabase CLI**: The primary tool for local development.
    ```bash
    npm install supabase --save-dev
    ```

## Installation & Setup

1.  **Initialize the Project**:
    ```bash
    npx supabase init
    ```

2.  **Login to Supabase**:
    ```bash
    npx supabase login
    ```

3.  **Link to Remote Project**:
    Replace `<your-project-id>` with the reference found in your Supabase Dashboard settings:
    ```bash
    npx supabase link --project-ref <your-project-id>
    ```

## Local Development

1.  **Start Local Services**:
    Launch the Postgres database, Auth service, and Edge Function runtime:
    ```bash
    npx supabase start
    ```
    *Note: The first run will download Docker images and may take several minutes.*

2.  **Apply Database Schema**:
    Push the relational model (USER, ROLE, SCENE, ATTEMPT tables) to your local instance:
    ```bash
    npx supabase db reset
    ```

3.  **Generate Type Definitions**:
    Introspect your schema to create TypeScript types for your Edge Functions:
    ```bash
    npx supabase gen types typescript --local > supabase/functions/_shared/database.types.ts
    ```
