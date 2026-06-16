import API from "./axios";

export const sendForgotPasswordOtp = (email) =>
  API.post("/auth/forgot-password/send-otp", { email });

export const resetPasswordWithOtp = ({ email, otp, newPassword }) =>
  API.post("/auth/forgot-password/reset", { email, otp, newPassword });
