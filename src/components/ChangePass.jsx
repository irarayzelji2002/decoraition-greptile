import * as React from "react";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import Password from "./PassInput";

import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { jwtDecode } from "jwt-decode";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { showToast } from "../functions/utils";

function isTokenExpired(token) {
  try {
    const decoded = jwtDecode(token);
    return decoded.exp < Date.now() / 1000;
  } catch (error) {
    return true;
  }
}

export default function ChangePass({ email, token }) {
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState("");

  useEffect(() => {
    const checkTokenExpiration = () => {
      if (isTokenExpired(token)) {
        showToast("error", "Your session has expired. Please try again.");
        navigate("/forgot");
      }
    };
    checkTokenExpiration();
    const intervalId = setInterval(checkTokenExpiration, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [token, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    let formErrors = {};
    if (!newPassword) formErrors.newPassword = "Password is required";
    else {
      if (newPassword.length < 6)
        formErrors.newPassword = "Password must be at least 6 characters long";
      if (!/[!@#$%^&*]/.test(newPassword))
        formErrors.newPassword = "Password must contain at least 1 special character";
    }
    if (!confirmPassword) formErrors.confirmPassword = "Confirm password is required";
    else if (confirmPassword !== newPassword) formErrors.confirmPassword = "Passwords do not match";

    // Returning early if there are form errors
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return { formErrors, finalData: null };
    }

    try {
      const response = await axios.put("/api/change-password", { email, newPassword, token });
      if (response.data.success) {
        showToast("success", "Password changed successfully");
        navigate("/login");
      } else {
        throw new Error("Failed to change password");
      }
    } catch (error) {
      showToast("error", error.response?.data?.message || "Failed to change password");
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <p
            style={{
              color: "gray",
              fontSize: "12px",
            }}
          >
            At least 6 characters long, with 1 special character
          </p>
          <span className="formLabels">
            New Password
            <span style={{ color: "var(--color-quaternary)" }}> *</span>
          </span>
          <Password
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={!!errors.newPassword}
            helperText={errors.newPassword}
          />
          <span className="formLabels">
            Confirm New Password
            <span style={{ color: "var(--color-quaternary)" }}> *</span>
          </span>
          <Password
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={!!errors.confirmPassword}
            label="Confirm Password"
            helperText={errors.confirmPassword}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              mb: 2,
              backgroundImage: "linear-gradient(90deg, #f89a47, #f15f3e, #ec2073);",
              borderRadius: "20px",
              textTransform: "none",
              fontWeight: "bold",
            }}
          >
            Change Password
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
