import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Avatar, Box, IconButton, ListItemIcon, ListItemText } from "@mui/material";
import {
  SettingsBackupRestoreRounded as ReopenIcon,
  MoreHoriz as MoreHorizIcon,
} from "@mui/icons-material";
import { FaCircle } from "react-icons/fa";
import { showToast, stringAvatarColor, stringAvatarInitials } from "../../functions/utils.js";
import { useSharedProps } from "../../contexts/SharedPropsContext.js";
import { iconButtonStyles } from "./DrawerComponent.jsx";
import { CheckIconSmallGradient } from "../DesignSpace/svg/AddColor.jsx";
import { DeleteIcon } from "../../components/svg/DefaultMenuIcons.jsx";
import { CustomMenuItem } from "../DesignSpace/CommentContainer.jsx";
import { formatDateDetail } from "./backend/HomepageActions.jsx";

function Notif({ notif }) {
  const { user, users, userDoc } = useSharedProps();

  // Notification data
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isReadInApp, setIsReadInApp] = useState(false);
  const [senderUsername, setSenderUsername] = useState("");
  const [senderProfilePic, setSenderProfilePic] = useState("");
  const [timeDiff, setTimeDiff] = useState("");

  const [showOptions, setShowOptions] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const senderUser = users.find((user) => user.id === notif.notifBy);
    const senderProfilePic = senderUser?.profilePic || "";
    const senderUsername = senderUser?.username || "";

    setType(notif.type);
    setTitle(notif.title);
    setContent(notif.content);
    setIsReadInApp(notif.isReadInApp);
    setSenderUsername(senderUsername);
    setSenderProfilePic(senderProfilePic);
    // calculate time difference from now with notif.createdAt use formatDateDetail then setTimeDiff
  }, [notif, users]);

  const toggleOptions = () => {
    setShowOptions((prev) => !prev);
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowOptions(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleChangeNotifReadStatus = async () => {
    // Call changeNotifReadStatus
    const result = await changeNotifReadStatus(notif.id, isReadInApp, user, userDoc);
    if (!result.success) {
      showToast("error", result.message);
      return;
    }
    showToast("success", result.message);
    toggleOptions();
  };

  const changeNotifReadStatus = async (notifId, isReadInApp, user, userDoc) => {
    try {
      console.log("notif - change status passed data", { notifId, isReadInApp, user, userDoc });
      const response = await axios.put(
        `/api/notification/${notifId}/change-notif-status`,
        { userId: userDoc.id, status: isReadInApp },
        {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        }
      );
      if (response.status === 200) {
        return {
          success: true,
          message: `Notification marked as ${!isReadInApp ? "read" : "unread"}`,
        };
      }
    } catch (error) {
      console.error(
        `Error marking notification as ${!isReadInApp ? "read" : "unread"}:`,
        error?.response?.data?.error || error.message
      );
      return {
        success: false,
        message:
          error?.response?.data?.error ||
          `Failed to mark notification as ${!isReadInApp ? "read" : "unread"}`,
      };
    }
  };

  const handleDeleteNotif = async (user, userDoc) => {
    // Call deleteNotif
    const result = await deleteNotif(notif.id, user, userDoc);
    if (!result.success) {
      showToast("error", result.message);
      return;
    }
    showToast("success", result.message);
    toggleOptions();
  };

  const deleteNotif = async (notifId, user, userDoc) => {
    console.log("notif - delete notif passed data", { notifId, user, userDoc });
    try {
      const response = await axios.post(
        `/api/notification/${notifId}/delete-notif`,
        { userId: userDoc.id },
        {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        }
      );
      if (response.status === 200) {
        return { success: true, message: "Notification deleted successfully" };
      }
    } catch (error) {
      console.error("Error deleting notification:", error?.response?.data?.error || error.message);
      return {
        success: false,
        message: error?.response?.data?.error || "Failed to delete notification",
      };
    }
  };

  return (
    <div>
      <div className={`notif-box ${!isReadInApp && "unread"}`}>
        <div className="hoverOverlay"></div>
        <FaCircle className="unreadCircle" />
        <div className="profile-section">
          <div className="profile-info">
            <Box
              sx={{
                width: 42,
                height: 42,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--gradientButton)",
                borderRadius: "50%",
                padding: "2.5px",
                marginRight: "15px",
              }}
            >
              <Avatar
                src={userDoc?.profilePic ? userDoc?.profilePic : ""}
                sx={{
                  height: 41.5,
                  width: 41.5,
                  borderRadius: "50%",
                  boxShadow: "0 0 0 2.5px var(--gradientButton)",
                  "& .MuiAvatar-img": {
                    borderRadius: "50%",
                  },
                  "& svg": {
                    marginTop: "10px",
                  },
                  ...stringAvatarColor(senderUsername),
                }}
                children={stringAvatarInitials(senderUsername)}
              />
            </Box>
            <div className="user-details">
              <span className="notifTitle">{title}</span>
              <span className="notifContent">
                {senderUsername ? (
                  <>
                    <strong>{senderUsername}</strong>
                    <span>{content}</span>
                  </>
                ) : (
                  <>
                    <span>{content}</span>
                  </>
                )}
              </span>
              <span className="notifDate">{timeDiff}</span>
            </div>
          </div>
          <div
            className="profile-status"
            style={{
              marginLeft: "4px",
              display: "flex",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            {!isReadInApp ? (
              <IconButton
                sx={{
                  ...iconButtonStyles,
                  padding: "8px",
                  marginRight: "-50px",
                  width: "38px",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleChangeNotifReadStatus();
                }}
              >
                <CheckIconSmallGradient />
              </IconButton>
            ) : (
              <IconButton
                edge="end"
                aria-label="more"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOptions();
                }}
                sx={iconButtonStyles}
              >
                <MoreHorizIcon />
              </IconButton>
            )}

            {showOptions && (
              <div
                className="dropdown-menu notif-menu"
                style={{
                  position: "absolute",
                  top: "0",
                  marginTop: "10px",
                }}
              >
                <CustomMenuItem
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChangeNotifReadStatus();
                  }}
                >
                  <ListItemIcon>
                    <ReopenIcon className="notificon" sx={{ color: "var(--color-white)" }} />
                  </ListItemIcon>
                  <ListItemText primary="Mark as unread" sx={{ color: "var(--color-white)" }} />
                </CustomMenuItem>
                <CustomMenuItem
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNotif();
                  }}
                >
                  <ListItemIcon>
                    <DeleteIcon className="icon" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Delete notification"
                    sx={{ color: "var(--color-white)" }}
                  />
                </CustomMenuItem>
              </div>
            )}
          </div>
        </div>

        <div className=""></div>
      </div>
    </div>
  );
}

export default Notif;
