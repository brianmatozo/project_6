export const config = {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: "1d",
  },
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  validationCode: {
    expiresInMinutes: 30,
    expiresIn: 10 * 60 * 1000,
  },
};
