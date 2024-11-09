import { ThemeProvider } from "@mui/material/styles";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import defaultTheme from "../themes/defaultTheme";

const Layout = ({ children }) => {
  return (
    <ThemeProvider theme={defaultTheme}>
      <ToastContainer progressStyle={{ backgroundColor: "var(--brightFont)" }} />
      {children}
    </ThemeProvider>
  );
};

export default Layout;
