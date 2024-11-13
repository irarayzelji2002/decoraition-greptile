import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSharedProps } from "../../contexts/SharedPropsContext";
import {
  fetchUserDesigns,
  fetchUserProjects,
  handleCreateDesign,
  handleCreateProject,
  handleDeleteDesign,
  handleDeleteProject,
  handleViewChange,
  toggleDarkMode,
  toggleMenu,
  formatDate,
} from "./backend/HomepageActions";
import { stringAvatarColor, stringAvatarInitials } from "../../functions/utils.js";
import HomepageOptions from "./HomepageOptions";

import {
  Drawer,
  IconButton,
  Typography,
  Avatar,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Box,
} from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import NotificationsIcon from "@mui/icons-material/Notifications";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import NotifTab from "./NotifTab";
import { auth } from "../../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ArrowBackIosRounded as ArrowBackIosRoundedIcon } from "@mui/icons-material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DeleteIcon from "@mui/icons-material/Delete";
import LinkIcon from "@mui/icons-material/Link";
import { fetchUserData, fetchDesigns, fetchProjects } from "./backend/HomepageFunctions.jsx";
import { DesignIcn, FAQ, Home, LogoutIcn, ProjectIcn, SettingsIcn } from "./svg/DesignSvg.jsx";

const DrawerComponent = ({ isDrawerOpen = false, onClose }) => {
  const navigate = useNavigate();

  const {
    user,
    userDoc,
    handleLogout,
    designs,
    userDesigns,
    userDesignVersions,
    projects,
    userProjects,
  } = useSharedProps();
  const initDarkMode = userDoc?.theme === 0 ? true : false;
  const [userDesignsLatest, setUserDesignsLatest] = useState([]);
  const [userProjectsLatest, setUserProjectsLatest] = useState([]);
  const [darkMode, setDarkMode] = useState(initDarkMode);

  // Sorting designs by latest modifiedAt
  useEffect(() => {
    const designsByLatest = [...userDesigns].sort((a, b) => {
      return b.modifiedAt.toMillis() - a.modifiedAt.toMillis();
    });
    setUserDesignsLatest(designsByLatest);
  }, [designs, userDesigns]);

  // Sorting projects by latest modifiedAt
  useEffect(() => {
    const projectsByLatest = [...userProjects].sort((a, b) => {
      return b.modifiedAt.toMillis() - a.modifiedAt.toMillis();
    });
    setUserProjectsLatest(projectsByLatest);
  }, [projects, userProjects]);

  const getDesignImage = (designId) => {
    // Get the design
    const fetchedDesign = userDesigns.find((design) => design.id === designId);
    if (!fetchedDesign || !fetchedDesign.history || fetchedDesign.history.length === 0) {
      return "";
    }

    // Get the latest designVersionId
    const latestDesignVersionId = fetchedDesign.history[fetchedDesign.history.length - 1];
    const fetchedLatestDesignVersion = userDesignVersions.find(
      (designVer) => designVer.id === latestDesignVersionId
    );
    if (
      !fetchedLatestDesignVersion ||
      !fetchedLatestDesignVersion.images ||
      fetchedLatestDesignVersion.images.length === 0
    ) {
      return "";
    }

    // Return the first image's link from the fetched design version
    return fetchedLatestDesignVersion.images[0].link;
  };

  const getProjectImage = (projectId) => {
    // Get the project
    const fetchedProject = userProjects.find((project) => project.id === projectId);
    if (!fetchedProject || fetchedProject.designs.length === 0) {
      return "";
    }

    // Get the latest designId (the last one in the designIds array)
    const latestDesignId = fetchedProject.designs[fetchedProject.designs.length - 1];

    // Return the design image by calling getDesignImage
    return getDesignImage(latestDesignId);
  };

  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const handleNotifClick = () => {
    setIsNotifOpen(true);
  };

  const handleNotifClose = () => {
    setIsNotifOpen(false);
  };

  const [clickedId, setClickedId] = useState("");
  const [optionsState, setOptionsState] = useState({
    showOptions: false,
    selectedId: null,
  });

  const toggleOptions = (id) => {
    setOptionsState((prev) => {
      if (prev.selectedId === id) {
        // If the same ID is clicked, close the options menu
        return { showOptions: false, selectedId: null };
      } else {
        // Open options for the new ID
        return { showOptions: true, selectedId: id };
      }
    });
  };

  useEffect(() => {
    toggleOptions(clickedId);
  }, [clickedId]);

  const handleOptionsClick = (id, event) => {
    event.stopPropagation();
    event.preventDefault();
    setClickedId(id);
    if (clickedId === id) {
      setClickedId(null);
    }
  };

  useEffect(() => {
    console.log("showOptions:", optionsState.showOptions, "; selectedId:", optionsState.selectedId);
  }, [optionsState]);

  return (
    <Drawer
      anchor="left"
      open={Boolean(isDrawerOpen)}
      onClose={onClose}
      sx={{
        zIndex: "13001",
        "& .MuiDrawer-paper": {
          width: { xs: "90%", sm: "50%", md: "35%", lg: "25%" },
          minWidth: "350px",
          backgroundColor: darkMode ? "var(--bgMain)" : "var(--nav-card-modal )",
          color: darkMode ? "white" : "black",
          padding: "20px 0px 20px 0px",
          height: "calc(100% - 40px)",
          display: "flex",
          flexDirection: "column",
        },
        "& .MuiDrawer-paper::-webkit-scrollbar": {
          display: "none",
        },
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "10px",
            spaceBetween: "space-between",
          }}
        >
          <IconButton
            sx={{
              ...iconButtonStyles,
              marginLeft: "5px",
            }}
          >
            <ArrowBackIosRoundedIcon onClick={onClose} />
          </IconButton>
          <h2 className="navName drawer">DecorAItion</h2>
          <IconButton
            sx={{ ...iconButtonStyles, marginLeft: "auto" }}
            onClick={() => toggleDarkMode(user, userDoc?.id, darkMode, setDarkMode)}
          >
            {darkMode ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
          <IconButton onClick={handleNotifClick} sx={{ ...iconButtonStyles, marginRight: "15px" }}>
            <NotificationsIcon />
          </IconButton>
          <div>
            <NotifTab isNotifOpen={isNotifOpen} onClose={handleNotifClose} />
          </div>
        </div>
      </div>

      <div className="drawerUser">
        <Box
          sx={{
            width: 60,
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--gradientButton)",
            borderRadius: "50%",
            padding: "4px",
          }}
        >
          <Avatar
            sx={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              border: "4px solid transparent",
              boxShadow: "0 0 0 4px var(--gradientButton)",
              fontSize: "1.5rem",
              "& .MuiAvatar-img": {
                borderRadius: "50%",
              },
              ...stringAvatarColor(userDoc?.username),
            }}
            src={userDoc?.profilePic || ""}
            children={stringAvatarInitials(userDoc?.username)}
          />
        </Box>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexDirection: "column",
            flexGrow: 1,
            margin: "-6px 0px 0px 5px",
          }}
        >
          <Typography variant="body1" style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
            {`${userDoc?.firstName || ""} ${userDoc?.lastName || ""}`.toUpperCase() || "GUEST"}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: "0.8rem", fontWeight: "300" }}>
            {userDoc?.username || "Guest"}
          </Typography>
        </div>
      </div>
      <List>
        <ListItemButton onClick={() => navigate("/homepage")} sx={listItemStyles}>
          <ListItemIcon sx={listItemIconStyles}>
            <Home />
          </ListItemIcon>
          <ListItemText primary="Home" />
        </ListItemButton>

        <ListItemButton onClick={() => navigate("/seeAllDesigns")} sx={listItemStyles}>
          <ListItemIcon sx={listItemIconStyles}>
            <DesignIcn />
          </ListItemIcon>
          <ListItemText primary="Design" />
        </ListItemButton>
        <ListItemButton onClick={() => navigate("/seeAllProjects")} sx={listItemStyles}>
          <ListItemIcon sx={listItemIconStyles}>
            <ProjectIcn />
          </ListItemIcon>
          <ListItemText primary="Projects" />
        </ListItemButton>
        <Divider sx={{ backgroundColor: "var(--inputBg)", my: 2 }} />
        <Typography
          variant="body2"
          sx={{
            paddingLeft: 2,
            margin: "23px 0px 8px 0px",
            fontWeight: "bold",
            fontSize: "0.9em",
            opacity: 0.8,
          }}
        >
          Recent Designs
        </Typography>

        {userDesignsLatest.length > 0 ? (
          userDesignsLatest.slice(0, 3).map((design, index) => (
            <ListItemButton
              key={design.id}
              button
              onClick={() =>
                navigate(`/design/${design.id}`, {
                  state: { designId: design.id },
                })
              }
              sx={listItemStyles}
            >
              <div className="miniThumbnail">
                <img src={getDesignImage(design.id)} alt="" />
              </div>
              <ListItemText primary={design.designName} />
              <IconButton
                edge="end"
                aria-label="more"
                onClick={(e) => handleOptionsClick(design.id, e)}
                sx={iconButtonStyles}
              >
                <MoreHorizIcon />
              </IconButton>
              {optionsState.showOptions && optionsState.selectedId === clickedId && (
                <div style={{ marginTop: "39px" }}>
                  <HomepageOptions
                    isDesign={true}
                    isTable={true}
                    isDrawer={true}
                    id={design.id}
                    onOpen={() =>
                      navigate(`/design/${design.id}`, {
                        state: { designId: design.id },
                      })
                    }
                    optionsState={optionsState}
                    setOptionsState={setOptionsState}
                    object={design}
                  />
                </div>
              )}
            </ListItemButton>
          ))
        ) : (
          <ListItemButton>
            <ListItemText primary="No recent designs" />
          </ListItemButton>
        )}

        <Divider sx={{ backgroundColor: "var(--inputBg)", my: 2 }} />
        <Typography
          variant="body2"
          sx={{
            paddingLeft: 2,
            margin: "23px 0px 8px 0px",
            fontWeight: "bold",
            fontSize: "0.9em",
            opacity: 0.8,
          }}
        >
          Recent Projects
        </Typography>

        {userProjectsLatest.length > 0 ? (
          userProjectsLatest.slice(0, 3).map((project, index) => (
            <ListItemButton
              key={project.id}
              button
              onClick={() =>
                navigate(`/project/${project.id}`, {
                  state: { projectId: project.id },
                })
              }
              sx={listItemStyles}
            >
              <div className="miniThumbnail">
                <img src={getProjectImage(project.id)} alt="" />
              </div>
              <ListItemText primary={project.projectName} />
              <IconButton
                edge="end"
                aria-label="more"
                sx={iconButtonStyles}
                onClick={(e) => handleOptionsClick(project.id, e)}
              >
                <MoreHorizIcon />
              </IconButton>
              {optionsState.showOptions && optionsState.selectedId === clickedId && (
                <div style={{ marginTop: "39px" }}>
                  <HomepageOptions
                    isDesign={false}
                    isTable={true}
                    isDrawer={true}
                    id={project.id}
                    onOpen={() =>
                      navigate(`/project/${project.id}`, {
                        state: { projectId: project.id },
                      })
                    }
                    optionsState={optionsState}
                    setOptionsState={setOptionsState}
                    object={project}
                  />
                </div>
              )}
            </ListItemButton>
          ))
        ) : (
          <ListItemButton>
            <ListItemText primary="No recent designs" />
          </ListItemButton>
        )}

        <Divider sx={{ backgroundColor: "var(--inputBg)", my: 2 }} />

        {/* Settings Menu Item */}
        {/* path to change? */}
        <ListItemButton onClick={() => navigate("/faq")} sx={listItemStyles}>
          <ListItemIcon sx={listItemIconStyles}>
            <FAQ />
          </ListItemIcon>
          <ListItemText primary="FAQ" />
        </ListItemButton>
        <ListItemButton onClick={() => navigate("/settings")} sx={listItemStyles}>
          <ListItemIcon sx={listItemIconStyles}>
            <SettingsIcn />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItemButton>
        <ListItemButton onClick={() => handleLogout(navigate)} sx={listItemStyles}>
          <ListItemIcon sx={listItemIconStyles}>
            <LogoutIcn />
          </ListItemIcon>
          <ListItemText primary="Sign Out" />
        </ListItemButton>
      </List>
    </Drawer>
  );
};

export default DrawerComponent;

export const iconButtonStyles = {
  color: "var(--color-white)",
  borderRadius: "50%",
  "&:hover": {
    backgroundColor: "var(--iconButtonHover) !important",
  },
  "& .MuiTouchRipple-root span": {
    backgroundColor: "var(--iconButtonActive) !important",
  },
};

const listItemStyles = {
  cursor: "pointer",
  padding: "6.5px 20px",
  "&:hover": {
    backgroundColor: "var(--iconButtonHover)",
  },
  "& .MuiTouchRipple-root span": {
    backgroundColor: "var(--iconButtonActive)",
  },
};

const listItemIconStyles = {
  minWidth: "0px",
  marginRight: "20px",
  marginLeft: "5px",
};
