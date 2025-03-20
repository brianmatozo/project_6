I'll create a backend in ElysiaJS using Bun with TypeScript that connects to a MySQL database and implements user registration with email validation.

## Project Setup

First, let's set up our project structure:

```bash
mkdir elysia-auth-api
cd elysia-auth-api
bun init -y
bun add elysia @elysiajs/jwt @elysiajs/cookie mysql2 react-email @react-email/components react react-dom nodemailer
bun add -D typescript @types/node
```

## Database Setup

Let's create our MySQL schema:

```sql
CREATE DATABASE IF NOT EXISTS auth_db;
USE auth_db;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verification_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Project Structure

Let's organize our code:

```
src/
  ├── index.ts
  ├── config.ts
  ├── db.ts
  ├── middleware/
  │   └── auth.ts
  ├── routes/
  │   ├── auth.ts
  │   └── user.ts
  └── emails/
      └── verification.tsx
```

## Database Connection

First, let's set up our database connection:

```typescript
// src/db.ts
import mysql from 'mysql2/promise';
import { config } from './config';

export const pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const db = {
  async query(sql: string, params?: any[]) {
    const [results] = await pool.query(sql, params);
    return results;
  }
};
```

## Configuration

Let's create a configuration file:

```typescript
// src/config.ts
export const config = {
  port: 3000,
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-key',
    expiresIn: '1d'
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'auth_db'
  },
  email: {
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    user: process.env.EMAIL_USER || 'user@example.com',
    pass: process.env.EMAIL_PASS || 'password',
    from: process.env.EMAIL_FROM || 'noreply@example.com'
  },
  verification: {
    codeLength: 6,
    expiresIn: 10 * 60 * 1000 // 10 minutes in milliseconds
  }
};
```

## Email Template

Let's create our verification email template:

```tsx
// src/emails/verification.tsx
import * as React from 'react';
import { Tailwind, Section, Text } from '@react-email/components';

export default function VerificationEmail({ code }: { code: string }) {
  return (
    
      
        
          
            Verify your Email Address
          
          
            Use the following code to verify your email address
          
          {code}
          
            This code is valid for 10 minutes
          
          
            Thank you for joining us
          
        
      
    
  );
}
```

## Auth Middleware

Now, let's create our authentication middleware:

```typescript
// src/middleware/auth.ts
import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { config } from '../config';
import { db } from '../db';

export const authMiddleware = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: config.jwt.secret
    })
  )
  .derive(async ({ jwt, cookie: { authToken }, set }) => {
    // Get the token from the cookie
    const token = authToken.value;
    
    if (!token) {
      set.status = 401;
      throw new Error('Unauthorized: No token provided');
    }
    
    // Verify the token
    const payload = await jwt.verify(token);
    
    if (!payload || !payload.sub) {
      set.status = 401;
      throw new Error('Unauthorized: Invalid token');
    }
    
    // Get the user from the database
    const users = await db.query(
      'SELECT id, email, is_verified FROM users WHERE id = ?',
      [payload.sub]
    ) as any[];
    
    if (!users.length) {
      set.status = 401;
      throw new Error('Unauthorized: User not found');
    }
    
    const user = users[0];
    
    // Check if the user is verified
    if (!user.is_verified) {
      set.status = 403;
      throw new Error('Forbidden: Email not verified');
    }
    
    // Return the user for the next handlers
    return { user };
  });
```

## Auth Routes

Let's implement our authentication routes:

```typescript
// src/routes/auth.ts
import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { cookie } from '@elysiajs/cookie';
import { renderToStaticMarkup } from 'react-dom/server';
import nodemailer from 'nodemailer';
import { db } from '../db';
import { config } from '../config';
import VerificationEmail from '../emails/verification';

// Create email transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

// Generate a random verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
const sendVerificationEmail = async (email: string, code: string) => {
  const html = renderToStaticMarkup();
  
  await transporter.sendMail({
    from: config.email.from,
    to: email,
    subject: 'Verify your email address',
    html
  });
};

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: config.jwt.secret
    })
  )
  .use(cookie())
  .model({
    signup: t.Object({
      email: t.String({ format: 'email', error: 'Invalid email format' }),
      password: t.String({ minLength: 8, error: 'Password must be at least 8 characters long' })
    }),
    login: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String()
    }),
    verify: t.Object({
      email: t.String({ format: 'email' }),
      code: t.String({ minLength: 6, maxLength: 6 })
    })
  })
  .post('/signup', async ({ body, set }) => {
    try {
      // Check if user already exists
      const existingUsers = await db.query(
        'SELECT id FROM users WHERE email = ?',
        [body.email]
      ) as any[];
      
      if (existingUsers.length > 0) {
        set.status = 409;
        return { success: false, message: 'Email already registered' };
      }
      
      // Hash the password
      const hashedPassword = await Bun.password.hash(body.password, {
        algorithm: 'bcrypt',
        cost: 10
      });
      
      // Insert the user
      const result = await db.query(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [body.email, hashedPassword]
      ) as any;
      
      const userId = result.insertId;
      
      // Generate verification code
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + config.verification.expiresIn);
      
      // Save verification code
      await db.query(
        'INSERT INTO verification_codes (user_id, code, expires_at) VALUES (?, ?, ?)',
        [userId, code, expiresAt]
      );
      
      // Send verification email
      await sendVerificationEmail(body.email, code);
      
      return { 
        success: true, 
        message: 'User registered successfully. Please check your email for verification code.' 
      };
    } catch (error) {
      set.status = 500;
      return { success: false, message: 'An error occurred during registration' };
    }
  }, {
    body: 'signup'
  })
  .post('/verify', async ({ body, set }) => {
    try {
      // Get user by email
      const users = await db.query(
        'SELECT id, is_verified FROM users WHERE email = ?',
        [body.email]
      ) as any[];
      
      if (!users.length) {
        set.status = 404;
        return { success: false, message: 'User not found' };
      }
      
      const user = users[0];
      
      if (user.is_verified) {
        return { success: true, message: 'Email already verified' };
      }
      
      // Get verification code
      const codes = await db.query(
        'SELECT code, expires_at FROM verification_codes WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        [user.id]
      ) as any[];
      
      if (!codes.length) {
        set.status = 404;
        return { success: false, message: 'Verification code not found' };
      }
      
      const { code, expires_at } = codes[0];
      
      // Check if code is expired
      if (new Date(expires_at)  {
    try {
      // Get user by email
      const users = await db.query(
        'SELECT id, email, password, is_verified FROM users WHERE email = ?',
        [body.email]
      ) as any[];
      
      if (!users.length) {
        set.status = 401;
        return { success: false, message: 'Invalid email or password' };
      }
      
      const user = users[0];
      
      // Verify password
      const isPasswordValid = await Bun.password.verify(body.password, user.password, 'bcrypt');
      
      if (!isPasswordValid) {
        set.status = 401;
        return { success: false, message: 'Invalid email or password' };
      }
      
      // Check if user is verified
      if (!user.is_verified) {
        set.status = 403;
        return { success: false, message: 'Email not verified' };
      }
      
      // Generate JWT token
      const token = await jwt.sign({ 
        sub: user.id,
        email: user.email
      });
      
      // Set cookie
      authToken.set({
        value: token,
        httpOnly: true,
        maxAge: 60 * 60 * 24, // 1 day
        path: '/'
      });
      
      return { 
        success: true, 
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email
        }
      };
    } catch (error) {
      set.status = 500;
      return { success: false, message: 'An error occurred during login' };
    }
  }, {
    body: 'login'
  })
  .post('/resend-verification', async ({ body, set }) => {
    try {
      // Get user by email
      const users = await db.query(
        'SELECT id, is_verified FROM users WHERE email = ?',
        [body.email]
      ) as any[];
      
      if (!users.length) {
        set.status = 404;
        return { success: false, message: 'User not found' };
      }
      
      const user = users[0];
      
      if (user.is_verified) {
        return { success: true, message: 'Email already verified' };
      }
      
      // Generate new verification code
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + config.verification.expiresIn);
      
      // Delete old verification codes
      await db.query(
        'DELETE FROM verification_codes WHERE user_id = ?',
        [user.id]
      );
      
      // Save new verification code
      await db.query(
        'INSERT INTO verification_codes (user_id, code, expires_at) VALUES (?, ?, ?)',
        [user.id, code, expiresAt]
      );
      
      // Send verification email
      await sendVerificationEmail(body.email, code);
      
      return { 
        success: true, 
        message: 'Verification code sent. Please check your email.' 
      };
    } catch (error) {
      set.status = 500;
      return { success: false, message: 'An error occurred while resending verification code' };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' })
    })
  })
  .post('/logout', ({ cookie: { authToken } }) => {
    authToken.remove();
    return { success: true, message: 'Logged out successfully' };
  });
```

## User Routes (Protected)

Now, let's create some protected routes that require authentication:

```typescript
// src/routes/user.ts
import { Elysia } from 'elysia';
import { authMiddleware } from '../middleware/auth';
import { db } from '../db';

export const userRoutes = new Elysia({ prefix: '/user' })
  .use(authMiddleware) // Apply auth middleware to all routes
  .get('/profile', async ({ user }) => {
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email
      }
    };
  })
  .get('/dashboard', async ({ user }) => {
    // This route is protected and requires a verified email
    return {
      success: true,
      message: 'Welcome to your dashboard',
      user: {
        id: user.id,
        email: user.email
      }
    };
  });
```

## Main Application

Finally, let's tie everything together:

```typescript
// src/index.ts
import { Elysia } from 'elysia';
import { cookie } from '@elysiajs/cookie';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import { config } from './config';

const app = new Elysia()
  .use(cookie())
  .use(authRoutes)
  .use(userRoutes)
  .onError(({ code, error, set }) => {
    console.error(`Error [${code}]:`, error);
    
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { success: false, message: 'Not Found' };
    }
    
    if (code === 'VALIDATION') {
      set.status = 400;
      return { success: false, message: error.message };
    }
    
    set.status = 500;
    return { success: false, message: 'Internal Server Error' };
  })
  .listen(config.port, () => {
    console.log(`🦊 Server is running at http://localhost:${config.port}`);
  });

export type App = typeof app;
```

## Running the Application

To run the application, create a `package.json` script:

```json
{
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist",
    "start": "bun run dist/index.js"
  }
}
```

Then run:

```bash
bun run dev
```

## API Endpoints

- **POST /auth/signup** - Register a new user
- **POST /auth/verify** - Verify email with code
- **POST /auth/login** - Login user
- **POST /auth/resend-verification** - Resend verification code
- **POST /auth/logout** - Logout user
- **GET /user/profile** - Get user profile (protected)
- **GET /user/dashboard** - Access dashboard (protected)

This implementation provides a complete authentication system with email verification using ElysiaJS, Bun, and MySQL. The auth middleware ensures that protected routes can only be accessed by verified users.

Citations:
[1] https://elysiajs.com/tutorial
[2] https://dev.to/gaurishhs/create-a-crud-app-with-bun-and-elysiajs-gjn
[3] https://elysiajs.com/integrations/cheat-sheet
[4] https://sidorares.github.io/node-mysql2/docs
[5] https://stackoverflow.com/questions/77144353/infer-types-for-handlers-in-separate-files-for-elysiajs
[6] https://elysiajs.com/essential/route
[7] https://coreui.io/blog/how-to-validate-an-email-address-in-javascript/
[8] https://www.speakeasy.com/openapi/frameworks/elysia
[9] https://www.reddit.com/r/typescript/comments/1bfx2nh/how_did_elysiajs_manage_to_do_this/
[10] https://dev.to/harshmangalam/implement-jwt-refresh-token-authentication-with-elysia-js-and-prisma-a-step-by-step-guide-1dc
[11] https://elysiajs.com/recipe/react-email
[12] https://blog.stackademic.com/elysiajs-the-ultimate-typescript-backend-framework-5e821e170388
[13] https://elysiajs.com/essential/validation
[14] https://dev.to/xanyl/introducing-elysiajs-a-professional-web-framework-od
[15] https://stackoverflow.com/questions/73317991/connection-refused-when-connecting-to-mysql-using-nodejs-mysql2
[16] https://github.com/wsporto/elysia-typesql-pagination
[17] https://elysiajs.com/blog/with-prisma
[18] https://github.com/reyadek/elysia-app
[19] https://stackoverflow.com/questions/77108947/how-to-distinguish-response-validation-error-from-other-validation-errors-in-ely

---
Answer from Perplexity: pplx.ai/share
