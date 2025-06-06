# AlgoArena: Elevate Your Coding Skills!

**Unleash your potential** with AlgoArena, the ultimate platform for mastering algorithms and data structures. Dive into a world of coding challenges, real-time code execution, and competitive leaderboards. Whether you're a student, a seasoned developer, or just starting your coding journey, AlgoArena provides the tools and resources you need to **level up your skills and achieve coding mastery.**

**Why Choose AlgoArena?**

- **Sharpen Your Skills:** Access a vast library of coding problems designed to challenge and improve your algorithmic thinking.
- **Code in Any Language:** Execute your solutions in multiple programming languages, ensuring flexibility and compatibility.
- **Compete and Collaborate:** Climb the leaderboards, track your progress, and connect with a vibrant community of coders.

# AlgoArena

AlgoArena is a platform designed to help users improve their algorithmic and problem-solving skills. It provides a wide range of coding problems, allows users to execute code in different languages, track their progress, and compete on leaderboards.

## Key Features

- **Problem Solving:** Access a diverse set of algorithmic problems with varying difficulty levels.
- **Code Execution:** Execute code submissions in multiple programming languages.
- **User Authentication:** Secure user registration, login, and social authentication.
- **Progress Tracking:** Monitor personal progress with streaks, solved problems, and yearly contribution grids.
- **Leaderboards:** Compete with other users and track rankings.
- **Problem of the Day (POTD):** Solve a daily challenge problem.
- **Sheet Creation:** Create custom problem sheets.
- **Code Formatting:** Format code using dockerized formatters.

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JSON Web Tokens (JWT)
- **Code Execution:** Judge0 API
- **Cloud Storage:** Cloudinary
- **Containerization:** Docker
- **Formatting:** Prettier, Black, Clang-Format, Google Java Format

## Setup Instructions

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd algoArena
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    - Create a `.env` file in the root directory.
    - Add the following environment variables:

      ```
      DATABASE_URL=<Your PostgreSQL Database URL>
      DIRECT_URL=<Your Direct PostgreSQL Database URL>
      ACCESS_SECRET=<Your Access Token Secret>
      REFRESH_SECRET=<Your Refresh Token Secret>
      JWT_SECRET=<Your JWT Secret>
      CLOUDINARY_CLOUD_NAME=<Your Cloudinary Cloud Name>
      CLOUDINARY_API_KEY=<Your Cloudinary API Key>
      CLOUDINARY_API_SECRET=<Your Cloudinary API Secret>
      JUDGE0_API_URL=<Your Judge0 API URL>
      RAPIDAPI_KEY=<Your RapidAPI Key>
      FRONTEND_URL=<Your Frontend URL>
      NODE_ENV=development or production
      ```

4.  **Run Docker containers:**

    ```bash
    docker-compose up --build
    ```

5.  **Run migrations:**

    ```bash
    npx prisma migrate dev
    ```

6.  **Start the server:**

    ```bash
    npm run dev
    ```

## Contribution Guidelines

Contributions are welcome! Please follow these guidelines:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Write tests for your code.
4.  Submit a pull request with a clear description of your changes.

## License

This project is licensed under the MIT License.
