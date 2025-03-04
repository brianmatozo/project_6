import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "user",
  password: "password",
  database: "mydb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
});

export default db;
