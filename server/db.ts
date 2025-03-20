import mysql, { ResultSetHeader } from "mysql2/promise";
import { config } from "dotenv";
import { readFileSync } from "fs";

config();
//docker
const dbPassword = readFileSync("/run/secrets/db-password", "utf-8").trim();

//dev
//const dbPassword = readFileSync("./db/password.txt", "utf-8").trim();

const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT!, 10),
  user: process.env.MYSQL_USER,
  password: dbPassword,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
});
//const db = mysql.createPool({
//  host: "localhost",
//  port: "3306",
//  user: "root",
//  password: "password",
//  database: "mydb",
//  waitForConnections: true,
//  connectionLimit: 10,
//  queueLimit: 0,
//  multipleStatements: true,
//});
async function initializeDatabase() {
  const maxRetries = 5;
  let retryCount = 0;
  let connnected = false;

  while (retryCount < maxRetries && !connnected) {
    try {
      const connection = await db.getConnection();
      console.log("success connection to mysql");
      connection.release();

      await db.execute<ResultSetHeader>(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
          is_verified BOOLEAN DEFAULT FALSE
        )
      `);

      await db.execute<ResultSetHeader>(`
        CREATE TABLE IF NOT EXISTS validation_codes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          token VARCHAR(6) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          user_id INT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log("database initialized");
      connnected = true;
    } catch (error) {
      retryCount++;
      console.error(
        `Initilization failed (attempt ${retryCount}/${maxRetries})`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  if (!connnected) {
    console.error("Maximum Initilization attempts reached");
    process.exit(1);
  }
}

initializeDatabase();

export default db;
