import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  IconButton,
  Link,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { showToast } from "../functions/utils";
import { iconButtonStyles } from "../pages/Homepage/DrawerComponent";
import { gradientButtonStyles, outlinedButtonStyles } from "../pages/DesignSpace/PromptBar";
import { textFieldInputProps, textFieldStyles } from "../pages/DesignSpace/DesignSettings";

const RenameModal = ({ isOpen, onClose, handleRename, isDesign, object }) => {
  // if isDesign is true, object is a design object, else it is a project object
  const [newName, setNewName] = useState(
    isDesign ? object?.designName ?? "Untitled Design" : object?.projectName ?? "Untitled Project"
  );
  const [error, setError] = useState("");
  const [isRenameBtnDisabled, setIsRenameBtnDisabled] = useState(false);

  const onSubmit = async () => {
    setIsRenameBtnDisabled(true);
    try {
      const result = await handleRename(newName);
      if (!result.success) {
        if (result.message === "Name is the same as the current name") setError(result.message);
        else showToast("error", result.message);
        return;
      }
      showToast("success", "Design name updated successfully");
      handleClose();
    } finally {
      setIsRenameBtnDisabled(false);
    }
  };

  const handleClose = () => {
    setError("");
    setNewName(
      isDesign ? object?.designName ?? "Untitled Design" : object?.projectName ?? "Untitled Project"
    );
    onClose();
  };

  useEffect(() => {
    console.log("isDesign", isDesign);
    console.log("object", object);
  }, []);

  return (
    <Dialog open={isOpen} onClose={handleClose} sx={dialogStyles}>
      <DialogTitle sx={dialogTitleStyles}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: "bold",
            fontSize: "1.15rem",
            flexGrow: 1,
            maxWidth: "80%",
            whiteSpace: "normal",
          }}
        >
          Rename
        </Typography>
        <IconButton
          onClick={handleClose}
          sx={{
            ...iconButtonStyles,
            flexShrink: 0,
            marginLeft: "auto",
          }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={dialogContentStyles}>
        <Typography variant="body1" sx={{ marginBottom: "10px" }}>
          {isDesign ? "Design" : "Project"} Name
        </Typography>
        <TextField
          placeholder="New Name"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setError("");
          }}
          helperText={error}
          FormHelperTextProps={{
            sx: {
              color:
                error === "Name is the same as the current name" ? "var(--errorText)" : "inherit",
            },
          }}
          variant="outlined"
          fullWidth
          sx={{
            ...textFieldStyles,
            marginBottom: "16px",
          }}
          InputProps={textFieldInputProps}
          inputProps={{ maxLength: 100 }}
        />
      </DialogContent>
      <DialogActions sx={dialogActionsStyles}>
        <Button
          fullWidth
          variant="contained"
          onClick={onSubmit}
          sx={{
            ...gradientButtonStyles,
            opacity: isRenameBtnDisabled ? "0.5" : "1",
            cursor: isRenameBtnDisabled ? "default" : "pointer",
            "&:hover": {
              backgroundImage: !isRenameBtnDisabled && "var(--gradientButtonHover)",
            },
          }}
          disabled={isRenameBtnDisabled}
        >
          Rename
        </Button>
        <Button
          fullWidth
          variant="contained"
          onClick={handleClose}
          sx={outlinedButtonStyles}
          onMouseOver={(e) =>
            (e.target.style.backgroundImage = "var(--lightGradient), var(--gradientButtonHover)")
          }
          onMouseOut={(e) =>
            (e.target.style.backgroundImage = "var(--lightGradient), var(--gradientButton)")
          }
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RenameModal;

export const dialogStyles = {
  "& .MuiDialog-paper": {
    backgroundColor: "var(--nav-card-modal)",
    borderRadius: "20px",
    maxWidth: "90vw",
    maxHeight: "90vh",
  },
};

export const dialogTitleStyles = {
  backgroundColor: "var(--nav-card-modal)",
  color: "var(--color-white)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid var(--inputBg)",
  fontWeight: "bold",
  padding: "10px 11px 10px 24px",
};

export const dialogContentStyles = {
  backgroundColor: "var(  --nav-card-modal)",
  color: "var(--color-white)",
  marginTop: "20px",
  display: "flex",
  justifyContent: "center",
  flexDirection: "column",
  padding: "20px",
  paddingBottom: 0,
  overflow: "auto",
  width: "min(50vw, 50vh)",
  "@media (max-width: 600px)": {
    width: "auto",
  },
};

export const dialogActionsStyles = {
  backgroundColor: "var(  --nav-card-modal)",
  margin: "20px",
  justifyContent: "center",
  display: "flex",
  gap: "15px",
  marginBottom: "20px",
  padding: 0,
  flexWrap: "nowrap",
  "@media (max-width: 600px)": {
    flexWrap: "wrap",
  },
};

export const dialogActionsVertButtonsStyles = {
  backgroundColor: "var(--nav-card-modal)",
  paddingBottom: "5px",
  flexDirection: "column",
  display: "flex",
  gap: "15px",
  width: "70%",
  margin: "auto",
  marginBottom: "20px",
  padding: 0,
  "@media (max-width: 600px)": {
    width: "100%",
  },
};
